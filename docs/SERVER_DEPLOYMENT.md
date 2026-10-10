# 服务器部署与维护记录

记录日期：2026-10-10。服务器：`8.148.11.126`。本页保留历次部署与维护记录；最新 RAG 代码版本为 [`1a6408c`](https://github.com/HFzhouzhou/jicui-jasmine-agent/commit/1a6408c)，已推送 GitHub 并完成下方[公网部署验收](#rag-release-1a6408c)。本页不包含模型密钥、管理员口令或证书私钥。

## 当前访问入口

| 用途 | 当前可用地址 |
| --- | --- |
| 原网站 | [https://8.148.11.126](https://8.148.11.126) |
| 茶饮智能体 | [https://8.148.11.126:888](https://8.148.11.126:888) |
| 茶饮管理页面 | [https://8.148.11.126:888/admin](https://8.148.11.126:888/admin) |
| 茶饮健康检查 | [https://8.148.11.126:888/api/health](https://8.148.11.126:888/api/health) |

IP 入口已使用 Let's Encrypt 签发的 IP 证书。证书目录为 `/etc/letsencrypt/live/jingshu-ip`，独立网关已使用该证书。

此前已完成的验收包括：两站公网 IP 入口首页、茶饮公网健康检查、内部静态文件核对及项目检查/构建。此前服务器内部的真实 DeepSeek 请求已返回 `live` 模式及 3 个候选；该结果与健康检查中仅表示密钥已配置的 `aiConfigured` 不同。最新知识库的公网文件上传与真实问答验收见下方记录。

<a id="rag-release-1a6408c"></a>

## 2026-10-10 RAG 发布验收（1a6408c）

### 发布版本与依赖

- 代码版本 `1a6408c` 已推送 `main`；服务器 `current` 指向 `/srv/jingshu/shop/releases/1a6408c`。
- 服务器为 Ubuntu 22.04，使用 Node.js 24.21。服务器独立执行 `npm ci`、完整 `npm run check` 和 `npm run build` 均通过，84 项测试全部成功；当次依赖审计返回 0 个已知漏洞。
- 已安装 Tesseract 4.1.1、Poppler 22.02 和 `chi_sim`、`eng` 识别语言包；实际能力检查确认 OCR 可用。向量服务未配置，当前使用本地检索与 DeepSeek 问答。

### 公网上传、问答与撤回

验收经由 `https://8.148.11.126:888` 完成，使用虚构资料验证，不将样例作为真实品牌知识：

| 资料类型 | 上传与解析 | 真实 DeepSeek 问答 |
| --- | --- | --- |
| Word 文档 | 上传、正文解析、原文件下载 SHA 核对通过 | 回答匹配资料内独特位置／编号，出处正确，约 2.3 秒 |
| 带文字层的 PDF | 上传、正文与页码解析、原文件下载 SHA 核对通过 | 回答匹配资料内独特位置／编号，出处正确，约 2.4 秒 |
| 扫描 PDF | 上传、OCR 解析、页码与正文、原文件下载 SHA 核对通过 | 回答匹配资料内独特位置／编号，出处正确，约 2.6 秒 |

三次发布后的真实回答均为 `notices=[]`，没有使用异常降级结果。随后逐份归档再提问，均不再返回对应旧事实或引用。另有一份 **1,442,036 字节**的 TXT 经公网上传成功，验证较大正文能够经过代理进入应用。上述四份虚构验收资料已全部归档，不参与顾客问答。以上耗时是三次验收请求的观察值，不代表稳定响应时延或吞吐量。

### 公网页面验收

- 公网 HTTPS 没有证书警告；后台登录正常，上传入口正确显示 6 种格式、单份 20 MB、每批最多 10 份及 OCR 提示。
- 归档筛选可查看四份验收资料；扫描文件的页码与正文展示正常。验收结束后已退出管理后台。
- 390×844 手机和 1440×1000 桌面视口均无横向溢出；浏览器未记录警告或错误。
- 页面验收截图保存在交付包的 `本地测试截图/RAG知识库-服务器验收.png`。

### 切换、备份与原站保护

- 发布前备份位于 `/srv/jingshu/shop/backups/pre-rag-20261010-110805`，包含私有运行配置、在线 SQLite 一致性备份，以及切换停服时完整复制的 `data-at-switch` 数据目录。
- 本轮仅重启 `shop` tmux 会话；`www` 和 `gateway` 原会话持续运行。原网站公网首页在发布前后的 SHA 相同。
- 仅茶饮 IP／域名入口的 Nginx 位置配置调整为 `client_max_body_size 21m`，代理读取和发送超时为 240 秒；未来域名 HTTPS 配置生成器同步使用这些值。原站配置未套用茶饮上传参数。
- 修复 `/usr/local/sbin/jingshu-sites` 的无效 `send-keys` 目标写法，使用明确的 `shop:0.0` 窗格目标；原脚本备份保留。看门狗与证书定时任务均处于 active 状态。
- 本轮没有重新查询域名备案进度或公网域名放行状态；下方域名表保留此前核查记录，域名访问仍列为待验收项。

## 域名与备案期间的状态（此前核查记录）

此前核查时，用户正在办理备案，两个域名的 DNS 已指向此服务器，HTTP 路由已预配置。**本轮 RAG 发布未重新核查备案或域名公网状态**，以下为保留的历史结果：

| 域名 | 对应服务 | 此前核查状态 |
| --- | --- | --- |
| `www.jingshutech.top` | 原网站 | HTTP 路由已配置；公网仍被云平台的备案检查拦截，域名 HTTPS 尚未签发 |
| `shop.jingshutech.top` | 茶饮智能体 | HTTP 路由已配置；公网仍被云平台的备案检查拦截，域名 HTTPS 尚未签发 |

此前采集到的公网拦截响应为阿里云 Beaver 的 `403 Non-compliance ICP Filing`。这不代表本机应用或域名路由未部署，也不能据此推定备案审批的完成时间。域名重新验收前，可使用上方已验收的 IP 地址。

公网放行且 DNS 继续正确解析后，已配置的域名 HTTP 入口即可使用。域名 HTTPS 自动任务按小时检查，并附加最多 5 分钟随机延迟：先通过 staging 验证演练，成功后才申请正式证书，随后安全重载网关以启用 HTTPS。**预计在放行后的下一次小时检查验证成功后自动启用**；云平台放行传播、验证和证书签发均可能带来延迟，不能保证审批完成即刻可用。正式签发成功前，不应把域名 HTTPS 写成已经可用。

## 运行结构与持久化目录

三个 root 用户的 tmux 会话分别运行网站与入口网关。应用服务仅监听本机回环地址，由独立网关提供公网入口。

| 会话 | 作用 | 内部地址或程序 |
| --- | --- | --- |
| `www` | 原静态网站 | `127.0.0.1:8081` |
| `shop` | 茶饮前端静态文件与 API | `127.0.0.1:3002` |
| `gateway` | 两站公网 HTTP/HTTPS 入口 | 发行版 Nginx 1.18，`/usr/sbin/nginx` |

| 路径 | 内容 |
| --- | --- |
| `/srv/jingshu/www/public` | 从原网站复制的静态文件 |
| `/srv/jingshu/shop/releases/<Git提交短ID>` | 各次发布的独立版本目录；首次部署为 `8c007e5` |
| `/srv/jingshu/shop/current` | 当前应用版本链接 |
| `/srv/jingshu/shop/shared/.env` | 服务器私有运行配置，包括模型密钥和管理员口令 |
| `/srv/jingshu/shop/shared/data` | 持久化 SQLite 数据目录，不随版本目录替换 |
| `/srv/jingshu/shop/backups/pre-rag-20261010-110805` | RAG 发布前的配置、在线 SQLite 与停服数据目录备份 |
| `/opt/node-v24.21.0-linux-x64` | 独立 Node.js 24.21.0 运行环境 |
| `/opt/jingshu-certbot` | 独立 Certbot 5.8 环境 |
| `/etc/jingshu/gateway.conf` | 网关主配置 |
| `/etc/jingshu/ip-sites.conf` | IP 访问入口配置 |
| `/etc/jingshu/domain-sites.conf` | 域名入口配置 |
| `/etc/jingshu/www.conf` | 原静态网站服务配置 |
| `/var/log/jingshu` | 部署服务日志目录 |
| `/root/jingshu-migration-20261009-172445` | 首次迁移前的备份目录 |

当前线上版本以 `readlink -f /srv/jingshu/shop/current` 的结果为准。发布新版本时保留旧版本目录，配置与数据继续使用 `shared`。

宝塔面板、宝塔任务、PHP 和旧 Nginx 已停止并禁用开机启动，原文件保留。当前网站入口使用上述独立 Nginx，不通过宝塔面板管理。不要未经核对同时启动旧网关，以免争用公网端口。

## 启停与查看状态

以下操作在通过 SSH 登录服务器后执行：

```sh
ssh root@8.148.11.126
```

统一控制入口：

```sh
/usr/local/sbin/jingshu-sites status
/usr/local/sbin/jingshu-sites start
/usr/local/sbin/jingshu-sites restart
/usr/local/sbin/jingshu-sites stop
```

上述四行分别是查询、启动、重启和停止命令，按需要选择执行，不要逐行一起运行。`restart` 和 `stop` 会影响两个网站的访问。`stop` 会设置暂停状态，防止看门狗立即重新拉起；恢复时使用 `start`。

三个会话的实际启动入口为：

- `/usr/local/libexec/jingshu-www`
- `/usr/local/libexec/jingshu-shop`
- `/usr/local/libexec/jingshu-gateway`

查看或进入会话：

```sh
tmux ls
tmux attach -t www
tmux attach -t shop
tmux attach -t gateway
```

进入会话后，按 `Ctrl+B`，松开后按 `D` 可退出查看并保持服务运行。停止服务请使用统一控制入口，避免用关闭终端或直接结束会话的方式代替维护操作。

## 开机恢复、看门狗与证书任务

| systemd 单元 | 已配置用途 |
| --- | --- |
| `jingshu-tmux.service` | 开机创建并启动上述 tmux 会话 |
| `jingshu-watchdog.timer` | 每 30 秒检查并补回缺失的会话；尊重统一控制入口设置的暂停状态 |
| `jingshu-cert-renew.timer` | 每天两次检查证书续期，续期 hook 重载网关 |
| `jingshu-domain-https.timer` | 每小时检查域名验证条件，附加最多 5 分钟随机延迟；先 staging 验证，再正式签发并安全启用 HTTPS |

这些任务已经启用。**此前 IP 证书的续期演练已成功，并执行了部署 hook，网关重载后公网访问正常。** 开机恢复已配置，未执行整机重启测试。域名正式证书与 HTTPS 启用结果本轮未重新核查，仍按文末清单待验收。

查看任务状态与下次运行时间：

```sh
systemctl status jingshu-tmux.service
systemctl status jingshu-watchdog.timer jingshu-cert-renew.timer jingshu-domain-https.timer
systemctl list-timers --all 'jingshu-*'
```

查看日志目录与启动服务日志：

```sh
ls -lh /var/log/jingshu
journalctl -u jingshu-tmux.service -n 100 --no-pager
```

看门狗补回会话不等于完整的应用健康检测。出现页面或 AI 请求异常时，仍需检查具体服务日志、健康接口和上游模型状态。

## 管理员口令与配置

在自己的终端通过 SSH 登录服务器后，在该 SSH 会话中用终端编辑器打开 `/srv/jingshu/shop/shared/.env`，查找 `ADMIN_TOKEN` 对应的值，并仅在管理页面的登录框中使用。不要把配置全文、管理员口令、DeepSeek 密钥或私钥发送到聊天、工单、截图或 Git 仓库。

模型服务配置也保存在同一私有文件中。修改后需要重启相应应用才能生效。维护前确认文件权限与运行账号一致，并保留私有备份；不要以仓库的 `.env.example` 覆盖服务器现有配置。

## 发布更新与回退原则

- 新版本在独立 release 目录完成依赖安装、检查与构建后，再更新 `current`；保留上一个可用版本，便于回退。
- Node 服务端构建仍依赖生产 `node_modules`，部署时不能只复制 `dist`。
- `shared/.env` 和 `shared/data` 属于持久运行资料，不放进版本替换或清理范围。
- 数据备份应在服务停止后复制整个 SQLite 数据目录，避免单独复制正在写入的主数据库而遗漏 WAL 内容。
- 网关变更前备份当前配置，先通过配置检查，再实施重载；原网站和茶饮应用必须分别验收。
- 若需要恢复迁移前服务，先核对备份、端口占用和证书状态，避免新旧 Nginx 同时争用入口。保留备份不代表可以不经检查直接恢复旧服务。

## 尚待完成的验收

- 备案相关公网放行后的两个域名 HTTP 访问。
- 自动任务完成域名验证、正式证书签发与 HTTPS 启用后的外部访问。
- 域名启用后的原站静态资源与深层路径，以及茶饮 `/menu`、`/admin`、API 和真实 AI 交互回归。

当前已交付 IP HTTPS 入口、证书续期机制和域名自动启用配置；域名公网访问仍列为待验收项，本轮未重新核查其放行状态。
