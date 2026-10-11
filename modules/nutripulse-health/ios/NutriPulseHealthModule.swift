// HealthKit 步数读取模块（只读不写；权限由用户主动触发同步时请求）
// 由 expo-modules-autolinking 按目录约定自动链接（modules/nutripulse-health）

import ExpoModulesCore
import HealthKit

public class NutriPulseHealthModule: Module {
  private let healthStore = HKHealthStore()

  public func definition() -> ModuleDefinition {
    Name("NutriPulseHealth")

    // 设备健康数据是否可用
    Function("availability") { () -> String in
      return HKHealthStore.isHealthDataAvailable() ? "available" : "unavailable"
    }

    // 请求读取步数授权（弹系统权限框）；仅在用户主动点同步时被调用
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
      guard HKHealthStore.isHealthDataAvailable(),
            let stepsType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
        return promise.resolve(nil)
      }
      let calendar = Calendar.current
      let startOfDay = calendar.startOfDay(for: Date())
      guard let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay) else {
        return promise.resolve(nil)
      }
      let predicate = HKQuery.predicateForSamples(
        withStart: startOfDay,
        end: endOfDay,
        options: .strictStartDate
      )
      let query = HKStatisticsCollectionQuery(
        quantityType: stepsType,
        quantitySamplePredicate: predicate,
        options: .cumulativeSum,
        anchorDate: startOfDay,
        intervalComponents: DateComponents(day: 1)
      )
      query.initialResultsHandler = { _, statistics, _ in
        var steps: Double?
        statistics?.enumerateStatistics(from: startOfDay, to: endOfDay) { result, _ in
          steps = result.sumQuantity()?.doubleValue(for: HKUnit.count())
        }
        promise.resolve(steps)
      }
      self.healthStore.execute(query)
    }
  }
}
