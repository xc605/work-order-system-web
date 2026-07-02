# 智能工单系统前端

基于 Vue 3、Vite、Pinia、Vue Router 和 Element Plus 的智能工单系统前端，对接后端项目 [work-order-system-backend](https://github.com/xc605/work-order-system-backend)。

## 功能

- 登录、登出、路由鉴权和刷新后的登录态恢复
- 工单创建、草稿保存、提交、撤回、审核、派单、接单处理、验收
- 按角色展示待办入口，覆盖提交人、审核人、派单人、处理人
- 管理端用户、部门、全部工单和首页统计
- 统一 Axios 请求封装，使用 Bearer Token 调用后端接口

## 技术栈

- Vue 3
- Vite
- Pinia
- Vue Router
- Element Plus
- Axios

## 本地启动

```bash
pnpm install
pnpm dev
```

开发环境默认通过 Vite 代理把 `/api` 转发到后端服务。后端地址可在环境配置中通过 `VITE_API_TARGET` 调整。

## 构建

```bash
pnpm build
```

构建后的静态文件输出到 `dist/`，部署时需要让前端请求能够转发到后端 API。
