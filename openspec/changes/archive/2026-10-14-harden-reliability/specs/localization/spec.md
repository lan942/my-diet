## MODIFIED Requirements

### Requirement: 提供双语语言包与系统语言判定
系统 SHALL 提供 `en` 与 `zh` 两套语言包（key-value），UI 全部文案 SHALL 经语言包输出，SHALL NOT 在组件中硬编码业务文案。语言判定 SHALL 跟随系统 locale：`zh*` 前缀映射为 zh，其余一律回退为 en（默认英文）。语言包 SHALL 支持 `{param}` 参数插值；插值 SHALL 以函数式替换按字面量插入参数值，参数值中的 `$&`、`` $` ``、`$'`、`$n` 等字符序列 SHALL NOT 被当作正则替换特殊模式，同名占位符在文案中出现多次 SHALL 全部替换。当前语言缺失某 key 时 SHALL 回退英文，英文也缺失时 SHALL 返回 key 本身；运行时遇到非 en/zh 的内部语言标记 SHALL 安全回退英文且不崩溃。

#### Scenario: 英文系统显示英文
- **WHEN** 设备系统语言为英语并启动应用
- **THEN** 所有页面文案显示英文（Tab 标签、按钮、提示、错误消息）

#### Scenario: 中文系统显示中文
- **WHEN** 设备系统语言为中文并启动应用
- **THEN** 所有页面文案显示中文，与既有语义一致

#### Scenario: 未支持语言回退英文
- **WHEN** 设备系统语言为法语（未提供语言包）
- **THEN** 应用回退显示英文文案，不出现缺 key 的裸标识符

#### Scenario: 替换值含美元符号序列按字面量插入
- **WHEN** 某文案含 `{name}` 占位符，参数值为 `$&` 或 `` $'$` ``
- **THEN** 文案中原样插入该字符串，占位符不复活、匹配文本不被重复插入

### Requirement: 服务层错误消息国际化
services 层 SHALL 抛出携带错误码（如 `ERR_INVALID_AGE`、`ERR_INVALID_STEPS`）的业务 Error，SHALL NOT 抛出面向用户的中文/英文字面消息；UI 层 SHALL 以 `error.<错误码>` 为语言包键（如错误码 `ERR_INVALID_GI` 对应键 `error.ERR_INVALID_GI`）将错误翻译为当前语言文案后展示，错误码无对应翻译或异常本身不含错误码时 SHALL 回退通用错误文案（error.generic）。vitest 对 services 的断言 SHALL 基于错误码。

#### Scenario: 校验失败返回错误码
- **WHEN** services 校验步数为 -100 失败
- **THEN** 抛出的 Error 携带错误码 `ERR_INVALID_STEPS`，UI 层以 `error.ERR_INVALID_STEPS` 查得当前语言的「步数必须为非负数」类文案展示

#### Scenario: 错误码翻译覆盖全部业务错误
- **WHEN** 遍历全部业务错误码检查语言包
- **THEN** en 与 zh 语言包均包含每个错误码的完整翻译，无缺失，且新增错误码（如 `ERR_INVALID_GI`）同样可被正确翻译而非退化通用文案

#### Scenario: 无错误码的异常回退通用文案
- **WHEN** UI 层收到普通 Error（无业务错误码）或未知错误码
- **THEN** 展示当前语言的通用错误文案（中文「出错了，请重试」/英文「Something went wrong」）
