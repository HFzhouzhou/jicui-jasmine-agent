# 服务器部署与维护记录

记录日期：2026-10-10。服务器：`8.148.11.126`。本页记录本次实际部署状态与维护入口，不包含模型密钥、管理员口令或证书私钥。

## 当前访问入口

| 用途 | 当前可用地址 |
| --- | --- |
| 原网站 | [https://8.148.11.126](https://8.148.11.126) |
| 茶饮智能体 | [https://8.148.11.126:888](https://8.148.11.126:888) |
| 茶饮管理页面 | [https://8.148.11.126:888/admin](https://8.148.11.126:888/admin) |
| 茶饮健康检查 | [https://8.148.11.126:888/api/health](https://8.148.11.126:888/api/health) |

IP 入口已使用 Let's Encrypt 签发的 IP 证书。证书目录为 `/etc/letsencrypt/live/jingshu-ip`，独立网关已使用该证书。

已完成的验收包括：两站公网 IP 入口首页、茶饮公网健康检查、内部静态文件核对及项目检查/构建。服务器内部的真实 DeepSeek 请求已返回 `live` 模式及 3 个候选；该结果与健康检查中仅表示密钥已配置的 `aiConfigured` 不同。

## 域名与备案期间的状态

用户正在办理备案。两个域名的 DNS 已指向此服务器，HTTP 路由已预配置：

| 域名 | 对应服务 | 当前状态 |
| --- | --- | --- |
| `www.jingshutech.top` | 原网站 | HTTP 路由已配置；公网仍被云平台的备案检查拦截，域名 HTTPS 尚未签发 |
| `shop.jingshutech.top` | 茶饮智能体 | HTTP 路由已配置；公网仍被云平台的备案检查拦截，域名 HTTPS 尚未签发 |

采集到的公网拦截响应为阿里云 Beaver 的 `403 Non-compliance ICP Filing`。这不代表本机应用或域名路由未部署，也不能据此推定备案审批的完成时间。备案期间使用上方已验收的 IP 地址。

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
| `/opt/node-v24.21.0-linux-x64` | 独立 Node.js 24.21.0 运行环境 |
| `/opt/jingshu-certbot` | 独立 Certbot 5.8 环境 |
| `/etc/jingshu/gateway.conf` | 网关主配置 |
| `/etc/jingshu/ip-sites.conf` | IP 访问入口配置 |
| `/etc/jingshu/domain-sites.conf` | 域名入口配置 |
| `/etc/jingshu/www.conf` | 原静态网站服务配置 |
| `/var/log/jingshu` | 部署服务日志目录 |
| `/root/jingshu-migration-20261009-172445` | 本次迁移前的备份目录 |

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

这些任务已经启用。**IP 证书的续期演练已成功，并执行了部署 hook，网关重载后公网访问正常。** 开机恢复已配置，未执行整机重启测试。域名正式证书仍待公网验证条件满足后签发。

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

当前已交付 IP HTTPS 入口、证书续期机制和域名自动启用配置；域名公网访问仍待备案放行后验证。
