# Vercel Pro 恢复与应用优化发布准备 v1.0

本轮日期：2026-11-12。所有者确认已经升级 Pro；本轮没有改动套餐、DNS、环境变量或生产数据，没有 Push 或 Deploy。实时证据存放在 `reports/production-recovery/`，旧报告保留为历史记录。

## 恢复证据与范围

本轮重新读取公网：首页、列表、详情、博客、RFQ 表单、全部 17 个品牌与 robots 可访问，缺失产品返回 404。www 保留路径及查询参数，以 308 跳转 apex。Sitemap 的 14,577 个 URL 中包含 13,695 个产品，与 main 冻结目录逐项一致。具体时间、响应及验收结果见本轮 `latest.md` / `latest.json`。

这是公网恢复证据，不是账户后台认证证明。Pro 来自所有者确认；没有已授权的 Vercel 账户接口，不能独立验证套餐、暂停标记、CPU 账单或域名绑定的精确 deployment ID。GitHub 本轮读取的最新成功 Production 记录对应 `f665f63830301feb94ad0159f5b15e5f0dc9f12f`；其 `production_environment` 字段为 false，独立部署 URL 返回登录重定向，不能将这条历史成功记录单独视为当前 alias 绑定证明。

没有读取密钥值，没有提交真实 RFQ、发送邮件或修改 CRM。生产授权业务事务、Google 收录和真实 Core Web Vitals 均不因公共页面通过而标为已验证。

## 发布候选边界

现场分支 `seo-geo-pro-max-v1`，应用优化提交 `e35d337a8f7322677cc9f1a3879f3b0a9908dcf1`。本轮 GitHub main 只读核对为 `f665f63830301feb94ad0159f5b15e5f0dc9f12f`；两侧分别有 2 / 5 个独有提交。不得直接发布当前工作树或整支覆盖 main。

候选在 `reports/production-recovery/candidate-source` 独立源码目录构建，以 main 的 Git blob 为基底，只叠加明确审查的 15 个 `app/`、`lib/`、`proxy.ts` 文件，以及相关回归测试和本文档。不包含新增产品、爬虫守卫候选、定时任务或自主运营策略变更。main 的 `.gitattributes`、`.gitignore`、历史发布文件及既有运行文件保持原样。最终候选提交和逐文件 SHA 见本轮报告；早期 `candidate.json` / `release.patch` 是修复前记录，不应作为最终发布印章。

首次在 `node_modules/.cache` 内构建触发 Turbopack Proxy 模块处理 panic；移动相同应用源码到独立源码目录后默认 Turbopack 构建成功，实际退出码 0。这定位了目录位置相关触发条件；堆栈本身不足以确定上游编译器内部缺陷。旧 PowerShell 日志把 stderr 的 workspace warning 标为 NativeCommandError，后续采用直接捕获 Node 子进程退出码。没有关闭 TypeScript 检查或切换打包器掩盖错误。

补充移动验收发现 `abb-000262939-y001` 的长型号在 390px 下撑宽至 525px，因此在产品详情容器增加继承的 `overflow-wrap:anywhere`，完整保留型号、链接和 JSON-LD。此项是相对 e35d337 的最小额外应用修复；重新构建并覆盖该型号及目录中最长型号的浏览器验收。

冻结产品 SHA-256：`8dc277d9d5e09daf1cc8c3765b7b0e806414608824a6b22cfb3eee045141571c`。本地工作目录 19,881 个产品，额外 6,186 个未发布；不得用该工作目录替换冻结的 13,695 产品。候选不会修改本地目录、checkpoint、import-log、图片缓存或任务定义。

## 测试与敏感信息隔离

本轮重跑完整测试及 ESLint。候选使用单独输出目录和合成环境变量构建，完全不复制或读取 `.env*`。这些 `.next` 构建物仅用于本地验收，**不能直接部署**：公开客户端配置是合成值，真正发布必须在现有受控平台重新构建。

验收覆盖 TypeScript、生产构建、17 品牌、产品/博客、robots、全部 sitemap 分片、canonical、JSON-LD、大小写重定向、404、ISR 及移动布局。业务接口仅在本地验证拒绝路径，不能替代 Supabase/Resend 成功链路的授权验收。原有图片标签警告不通过删除功能消除。

## 获得发布授权后的顺序

1. 再次只读核对 main 与当前 Production deployment ID；若 main 已变化，停止沿用本轮补丁，重新比较和验收。所有者在 Vercel 控制台确认 Pro、当前 alias、回滚部署及既有环境变量名称，不在聊天提供秘密值。
2. 从最新已核实 main 准备独立发布分支，只应用审查清单和必要测试文件，保留冻结目录及 main 发布保护文件。重新生成独立发布清单/验收印章，保留旧记录；旧发布 seal 不能证明新代码已验收。
3. Push、Preview Deploy 都需要另行明确授权。以现有受控变量构建 Preview，禁止使用本轮合成 `.next`；不要改动生产变量。核对全部分片总数、产品 SHA、308/404、ISR MISS→HIT、CDN 响应及无业务缓存。
4. 单独获得测试数据、测试收件人及 Supabase/Resend 测试事务授权后验证成功 RFQ、后台访问和报价权限；不要向真实客户发送验收邮件。核实没有重复邮件或意外写入。
5. 验收通过并获明确生产发布授权后再切换 Production。保留当前健康部署，不改 DNS，不迁移数据库，不更新产品目录。
6. 上线后检查同一组公共页面、RFQ 及缓存策略，观察 24–72 小时的请求数、错误率、CPU、缓存命中与费用。没有生产监控数据时，不承诺 CPU 降幅或预算上限。

## 风险与回滚

主要风险是分支分叉导致误带产品/删除发布保护文件、合成变量构建物被误部署、缓存/大小写行为在平台上的差异，以及尚未执行成功业务事务。线上仍是旧渲染策略，恢复可访问不代表 CPU 问题已经上线修复。

若上线后发生 5xx、404/308 错误、目录数量变化、RFQ 异常或缓存泄露，停止后续发布，并在明确授权后将 Production 指回上线前记录的健康部署。重新检查域名、目录、Sitemap、RFQ 和缓存；不回滚 Supabase、爬虫 checkpoint 或本地产品，不使用 `git reset --hard`。代码回退使用审查后的 revert 或上一健康部署，保持数据独立。

本轮恢复状态和后续发布状态分别记录：公共服务恢复不等于优化版本已发布，也不豁免外部授权验收。最终以本轮报告为准。
