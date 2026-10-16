// HealthKit 步数读取模块（只读不写；权限由用户主动触发连接时请求）
// 由 expo-modules-autolinking 按目录约定自动链接（modules/nutripulse-health）

import ExpoModulesCore
import HealthKit

public class NutriPulseHealthModule: Module {
  private let healthStore = HKHealthStore()

  // 仅按年月日解析（设备本地时区），与 JS 侧 YYYY-MM-DD 本地日界保持一致
  private lazy var dayFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = Calendar.current.timeZone
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter
  }()

  public func definition() -> ModuleDefinition {
    Name("NutriPulseHealth")

    // 设备健康数据是否可用
    Function("availability") { () -> String in
      return HKHealthStore.isHealthDataAvailable() ? "available" : "unavailable"
    }

    // 请求读取步数授权（弹系统权限框）；仅在用户主动点连接时被调用
    AsyncFunction("requestPermissions") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        return promise.resolve(false)
      }
      guard let stepsType = HKObjectType.quantityType(forIdentifier: .stepCount) else {
        return promise.resolve(false)
      }
      let readTypes: Set<HKObjectType> = [stepsType]
      self.healthStore.requestAuthorization(toShare: nil, read: readTypes) { success, _ in
        promise.resolve(success)
      }
    }

    // 读取当日步数总和；不可用/查询失败返回 null
    AsyncFunction("readTodaySteps") { (promise: Promise) in
      let calendar = Calendar.current
      let startOfDay = calendar.startOfDay(for: Date())
      guard let nextDay = calendar.date(byAdding: .day, value: 1, to: startOfDay) else {
        return promise.resolve(nil)
      }
      self.runStepsQuery(start: startOfDay, end: nextDay, promise: promise)
    }

    // 读取指定日期（YYYY-MM-DD，本地日界）步数总和；日期非法/不可用/失败返回 null
    AsyncFunction("readStepsForDate") { (date: String, promise: Promise) in
      guard let day = self.dayFormatter.date(from: date) else {
        return promise.resolve(nil)
      }
      let calendar = Calendar.current
      let startOfDay = calendar.startOfDay(for: day)
      guard let nextDay = calendar.date(byAdding: .day, value: 1, to: startOfDay) else {
        return promise.resolve(nil)
      }
      self.runStepsQuery(start: startOfDay, end: nextDay, promise: promise)
    }
  }

  // 在 [start, end) 半开区间内聚合步数（cumulativeSum）
  private func runStepsQuery(start: Date, end: Date, promise: Promise) {
    guard HKHealthStore.isHealthDataAvailable(),
          let stepsType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
      return promise.resolve(nil)
    }
    let predicate = HKQuery.predicateForSamples(
      withStart: start,
      end: end,
      options: .strictStartDate
    )
    let query = HKStatisticsCollectionQuery(
      quantityType: stepsType,
      quantitySamplePredicate: predicate,
      options: .cumulativeSum,
      anchorDate: start,
      intervalComponents: DateComponents(day: 1)
    )
    query.initialResultsHandler = { _, statistics, _ in
      var steps: Double?
      statistics?.enumerateStatistics(from: start, to: end) { result, _ in
        steps = result.sumQuantity()?.doubleValue(for: HKUnit.count())
      }
      promise.resolve(steps)
    }
    self.healthStore.execute(query)
  }
}
