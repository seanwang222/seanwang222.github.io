---
title: "目标跟踪 · 代码实践"
titleEn: ""
summary: "本章系统讲述 Target Tracking（目标跟踪）的核心算法。从最简单的 α β γ (GHK) 跟踪器入手，逐步扩展到完整的 Kalman 滤波器，并演示 3D 雷达目标跟踪的工程实现。"
part: "Part V"
chapter: 17
chapterTitle: "目标跟踪"
chapterTitleEn: "Target Tracking"
section: "0"
kind: "code"
order: 17999
tags: ["雷达系统", "第17章", "代码实践"]
source: "《雷达系统分析与设计（MATLAB版）》第 3 版 · 第 17 章代码"
---

---

## 一、章节概述

本章系统讲述 **Target Tracking（目标跟踪）** 的核心算法。从最简单的 **α-β-γ (GHK) 跟踪器** 入手，逐步扩展到完整的 **Kalman 滤波器**，并演示 3D 雷达目标跟踪的工程实现。

代码层面：
- **α-β-γ 跟踪器**（稳态 Kalman 滤波器）
- **3 状态 Kalman 滤波器**（位置/速度/加速度）
- **6 状态 3D Kalman 滤波器**（含交互式 GUI）

### 学习目标
1. 掌握 α-β-γ 跟踪器状态预测 + 加权更新
2. 理解 Kalman 滤波的 5 步流程：增益、更新、协方差更新、预测、外推
3. 掌握协方差矩阵的 Joseph 形式
4. 理解 3D 雷达跟踪中从球坐标到笛卡尔坐标的转换

---

## 二、代码清单表格

| # | 文件名 | 功能简述 | 教材公式/章节 |
|---|--------|----------|--------------|
| 1 | `ghk_tracker.m` | GHK α-β-γ 跟踪滤波器 | §17.x (GHK) |
| 2 | `Fig17_20.m` | GHK 跟踪器 θ=0.1 平滑模式 | 演示 |
| 3 | `Fig17_21.m` | GHK 跟踪器 θ=0.8 灵敏模式 | 演示 |
| 4 | `kalman_filter.m` | 3 状态 CA 模型 Kalman 滤波器 | §17.x (Kalman) |
| 5 | `Fig17_27.m` | Kalman 跟踪（无扰动） | 调用 `kalman_filter.m` |
| 6 | `Fig17_28.m` | Kalman 跟踪（含正弦扰动） | 调用 `kalman_filter.m` |
| 7 | `kalfilt.m` | 通用 6 状态 3D Kalman 滤波器 | §17.x (Kalman 完整) |
| 8 | `kalm.m` | 完整 3D 跟踪演示（生成+加噪+滤波） | 演示 |
| 9 | `testkalm.m` | Kalman 滤波器测试 | 测试 |
| 10 | `maketraj.m` | 生成 3D 目标轨迹 | 辅助 |
| 11 | `PolKal.m` | 极坐标 Kalman 滤波测试 | 标量 Kalman |
| 12 | `kalman_gui.m` | Kalman 跟踪 GUI（导弹/飞机预设） | GUI |

---

## 三、核心代码详解

### 3.1 `ghk_tracker.m` - GHK α-β-γ 跟踪器

**核心原理**（CA 模型 Constant Acceleration）：
1. **状态向量**：
$$
\mathbf{X} = [x, \dot{x}, \ddot{x}]^T = [\text{位置}, \text{速度}, \text{加速度}]^T
$$
2. **状态转移矩阵**：
$$
\boldsymbol{\Phi} = \begin{bmatrix} 1 & T & T^2/2 \\ 0 & 1 & T \\ 0 & 0 & 1 \end{bmatrix}
$$
3. **预测**：
$$
\mathbf{X}_n = \boldsymbol{\Phi} \mathbf{X}
$$
4. **残差**：
$$
e = z - \mathbf{X}_n(1)
$$
5. **增益**（smoothing coefficient $\theta$）：
$$
\alpha = 1 - \theta^3, \quad \beta = \frac{1.5(1+\theta)(1-\theta)^2}{T}, \quad \gamma = \frac{(1-\theta)^3}{T^2}
$$
6. **更新**：
$$
\mathbf{X}(1) \mathrel{+}= \alpha e, \quad \mathbf{X}(2) \mathrel{+}= \beta e, \quad \mathbf{X}(3) \mathrel{+}= \gamma e
$$

**关键代码**：
```matlab
function [residual, estimate] = ghk_tracker (X0, smoocof, inp, npts, T, nvar)
X = X0;
theta = smoocof;
% 增益计算
w1 = 1. - (theta^3);
w2 = 1.5 * (1. + theta) * ((1. - theta)^2) / T;
w3 = ((1. - theta)^3) / (T^2);
% 状态转移矩阵
PHI = [1. T (T^2)/2.; 0. 1. T; 0. 0. 1.];
% 迭代
while rn < npts
   XN = PHI * X;                       % 预测
   error = (inp(rn) + normrnd(0,nvar)) - XN(1);   % 残差
   residual(rn) = error;
   X(1) = XN(1) + w1 * error;          % 加权更新
   X(2) = XN(2) + w2 * error;
   X(3) = XN(3) + w3 * error;
   estimate(rn) = X(1);
   rn = rn + 1;
end
```

**$\theta$ 含义**：
- $\theta \to 0$：平滑，适合稳态目标（高噪声/低机动）
- $\theta \to 1$：灵敏，适合高机动目标

---

### 3.2 `Fig17_20.m` & `Fig17_21.m` - GHK 跟踪演示

**Fig17_20.m**：$\theta = 0.1$（高平滑）
- 残差较大但位置估计平滑
- 适合稳态目标

**Fig17_21.m**：$\theta = 0.8$（高灵敏）
- 残差较小但位置估计波动大
- 适合高机动目标

**输入信号**：
$$
inp = 1 + t^3 + 0.5 t^2 + \cos(2\pi \cdot 5 t)
$$

**输出**：
- `figure(1)`：残差序列
- `figure(2)`：估计位置 vs 真实位置
- `figure(3)`：真实位置

---

### 3.3 `kalman_filter.m` - 3 状态 Kalman 滤波器

**核心算法**（Kalman 5 步）：
1. **预测状态**：
$$
\mathbf{X}^- = \boldsymbol{\Phi} \mathbf{X}
$$
2. **协方差外推**：
$$
\mathbf{S}^- = \boldsymbol{\Phi} \mathbf{S} \boldsymbol{\Phi}^T + \mathbf{Q}
$$
3. **卡尔曼增益**（$H = [1, 0, 0]$）：
$$
\mathbf{K} = \mathbf{S}^-(1,:)^T / (\mathbf{S}^-(1,1) + R)
$$
4. **状态更新**：
$$
e = z - \mathbf{X}^-(1), \quad \mathbf{X} = \mathbf{X}^- + \mathbf{K} e
$$
5. **协方差更新**（Joseph 形式简化）：
$$
\mathbf{S}(1,:) \times (1 - \mathbf{K}(1)), \quad \mathbf{S}(i,j) = -\mathbf{K}(i)\mathbf{S}(1,j) + \mathbf{S}(i,j)
$$

**过程噪声协方差**（CA 模型，连续白噪声加速度离散化）：
$$
\mathbf{Q} = \sigma_a^2 \begin{bmatrix} T^5/20 & T^4/8 & T^3/6 \\ T^4/8 & T^3/3 & T^2/2 \\ T^3/6 & T^2/2 & T \end{bmatrix}
$$

**关键代码**：
```matlab
% 过程噪声协方差
Q(1,1) = (VAR * (T^5)) / 20.;
Q(1,2) = (VAR * (T^4)) / 8.;
Q(1,3) = (VAR * (T^3)) / 6.;
Q(2,1) = Q(1,2);
Q(2,2) = (VAR * (T^3)) / 3.;
Q(2,3) = (VAR * (T^2)) / 2.;
Q(3,1) = Q(1,3);
Q(3,2) = Q(2,3);
Q(3,3) = VAR * T;

while rn < N
   XN = PHI * X;                          % 预测
   S = PHI * S * PHI' + Q;                % 协方差外推
   ak(1) = S(1,1) / (S(1,1) + R);         % 卡尔曼增益
   ak(2) = S(1,2) / (S(1,1) + R);
   ak(3) = S(1,3) / (S(1,1) + R);
   error = inp(rn) + normrnd(0,R) - XN(1);
   X(1) = XN(1) + ak(1)*error;            % 状态更新
   X(2) = XN(2) + ak(2)*error;
   X(3) = XN(3) + ak(3)*error;
   % 协方差更新（Joseph 形式）
   S(1,1) = S(1,1) * (1. -ak(1));
   S(1,2) = S(1,2) * (1. -ak(1));
   S(1,3) = S(1,3) * (1. -ak(1));
   S(2,1) = S(1,2);
   S(2,2) = -ak(2) * S(1,2) + S(2,2);
   S(2,3) = -ak(2) * S(1,3) + S(2,3);
   S(3,1) = S(1,3);
   S(3,3) = -ak(3) * S(1,3) + S(3,3);
   rn = rn + 1;
end
```

---

### 3.4 `Fig17_27.m` & `Fig17_28.m` - Kalman 跟踪演示

**Fig17_27.m**（无扰动）：
- $R=0.01$, $nvar=0.18$（噪声小）
- 输入 $inp = 1 + 0.2t + 0.1t^2$

**Fig17_28.m**（有扰动）：
- $R=0.035$, $nvar=0.5$（噪声大）
- 输入 $inp = 1 + 0.2t + 0.1t^2 + \cos(2\pi \cdot 2.5 t)$

通过对比可看出 Kalman 滤波器对大噪声/扰动的鲁棒性。

---

### 3.5 `kalfilt.m` - 通用 6 状态 3D Kalman 滤波器

**完整 Kalman 算法**：
1. **卡尔曼增益**：
$$
\mathbf{K} = \mathbf{P}^- \mathbf{H}^T (\mathbf{H} \mathbf{P}^- \mathbf{H}^T + \mathbf{R})^{-1}
$$
2. **状态更新**：
$$
\hat{\mathbf{x}} = \hat{\mathbf{x}}^- + \mathbf{K}(\mathbf{z} - \mathbf{H} \hat{\mathbf{x}}^-)
$$
3. **协方差更新**：
$$
\mathbf{P} = (\mathbf{I} - \mathbf{K}\mathbf{H}) \mathbf{P}^-
$$
4. **状态预测**：
$$
\hat{\mathbf{x}}_{next}^- = \boldsymbol{\Phi} \hat{\mathbf{x}}
$$
5. **协方差预测**：
$$
\mathbf{P}_{next}^- = \boldsymbol{\Phi} \mathbf{P} \boldsymbol{\Phi}^T + \mathbf{Q}
$$

**状态结构**（6 状态）：
$$
\mathbf{x} = [x, v_x, y, v_y, z, v_z]^T
$$

**测量结构**（3 测量）：
$$
\mathbf{z} = [x, y, z]^T
$$

**测量矩阵**：
$$
\mathbf{H} = \begin{bmatrix} 1 & 0 & 0 & 0 & 0 & 0 \\ 0 & 0 & 1 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & 1 & 0 \end{bmatrix}
$$

**关键代码**：
```matlab
function [filtered, residuals, covariances, kalmgains] = kalfilt(trajectory, x0, P0, phi, R, Q)
NUMSTATES = 6;
NUMMEASUREMENTS = 3;
NUMPOINTS = size(trajectory, 2);
H = [1 0 0 0 0 0; 0 0 1 0 0 0; 0 0 0 0 1 0];
xhatminus = x0;
Pminus = P0;

for loop = 1: NUMPOINTS
   % 1. 卡尔曼增益
   K = Pminus*H'*inv(H*Pminus*H' + R);
   % 2. 状态更新
   z = trajectory(:,loop);
   xhat = xhatminus + K*(z - H*xhatminus);
   filtered(:,loop) = xhat;
   residuals(:,loop) = xhat - xhatminus;
   % 3. 协方差更新
   P = (eye(NUMSTATES) - K*H)*Pminus;
   covariances(:,loop) = diag(P);
   % 4. 状态预测
   xhatminus_next = phi*xhat;
   % 5. 协方差预测
   Pminus_next = phi*P*phi' + Q;
   xhatminus = xhatminus_next;
   Pminus = Pminus_next;
end
```

**输出**：
- `filtered`：滤波后轨迹（6×N）
- `residuals`：残差
- `covariances`：协方差矩阵对角线
- `kalmgains`：卡尔曼增益

---

### 3.6 `kalm.m` - 完整 3D 跟踪演示

**功能**：端到端 3D 雷达目标跟踪
1. 调用 `maketraj.m` 生成 3D 轨迹
2. 加噪（球坐标：方位、俯仰、距离）
3. 调用 `kalfilt.m` 进行 Kalman 滤波
4. 绘制多组结果图

**生成轨迹**（`maketraj.m`）：
$$
x(t) = x_0 + v_x \cdot t
$$
$$
y(t) = y_0 + A_y \cos(2\pi t/T_y)
$$
$$
z(t) = z_0 + A_z \cos(2\pi t/T_z)
$$

**关键代码**：
```matlab
function kalm(start_loc, velocity, yamp, yperiod, zamp, zperiod, samplingtime, deltat, sigmaaz, sigmael, sigmarange, x0, P0, R, Q)
phi = [1 deltat 0 0 0 0;
       0 1 0 0 0 0;
       0 0 1 deltat 0 0;
       0 0 0 1 0 0;
       0 0 0 0 1 deltat;
       0 0 0 0 0 1];
% 生成轨迹
[times trajectory] = maketraj(start_loc, velocity, yamp, yperiod, zamp, zperiod, samplingtime, deltat);
% 加噪（球坐标 → 笛卡尔）
[noisytraj] = addnoise(trajectory, sigmaaz, sigmael, sigmarange);
% Kalman 滤波
[filtered, residuals, covariances, kalmgains] = kalfilt(noisytraj, x0, P0, phi, R, Q);
```

**输出图组**（共 7+ 组）：
1. 真实 3D 轨迹
2. 加噪 3D 轨迹
3. x/y/z 位置对比
4. 滤波后 x/y/z 位置
5. x/y/z 速度
6. x/y/z 位置残差
7. x/y/z 速度残差
8. 协方差对角线
9. 卡尔曼增益

---

### 3.7 `maketraj.m` - 3D 轨迹生成

**代码**：
```matlab
function [times, trajectory] = maketraj(start_loc, xvelocity, yamp, yperiod, zamp, zperiod, samplingtime, deltat)
times = 0: deltat: samplingtime;
x = start_loc(1) + xvelocity.*times;
if yperiod ~= 0
   y = start_loc(2) + yamp*cos(2*pi*(1/yperiod).*times);
else
   y = ones(1, length(times))*start_loc(2);
end
if zperiod ~= 0
   z = start_loc(3) + zamp*cos(2*pi*(1/zperiod).*times);
else
   z = ones(1, length(times))*start_loc(3);
end
trajectory = [x; y; z];
```

**应用**：
- `kalm.m` 中调用生成真实轨迹
- 可设置匀速直线（$y_{period}=0$ 或 $z_{period}=0$）或正弦机动

---

### 3.8 `PolKal.m` - 极坐标 Kalman 滤波（标量版）

**与 `kalman_filter.m` 关系**：代码逻辑完全相同（3 状态 CA 模型 Kalman），但参数 $R, VAR$ 不同。

**用途**：作为独立标量 Kalman 测试用例。

---

### 3.9 `testkalm.m` - kalfilt 测试

**功能**：用一个含噪声的标量测试信号，调用 6 状态 `kalfilt`（但仅测 z 通道）。

**输出**：
- `figure(1)`：输入信号
- `figure(2)`：Kalman 滤波输出
- `figure(3)`：残差

---

### 3.10 `kalman_gui.m` - 跟踪 GUI（GUIDE 自动生成）

**功能**：交互式 Kalman 跟踪 GUI
- 输入：起始位置、速度、机动幅度/周期、采样时间、采样间隔
- 测量噪声：方位、俯仰、距离的标准差
- 卡尔曼初值：$x_0$、$P_0$、$R$、$Q$ 矩阵
- 预设：导弹（Missile）和飞机（Airplane）参数

**预设参数对照**：

| 参数 | 导弹 | 飞机 |
|------|------|------|
| start_loc (m) | [100000, 0, 2000] | [100000, 0, 7000] |
| velocity (m/s) | -150 | -400 |
| yamp (m) | 500 | 1000 |
| yperiod (s) | 50 | 150 |
| samplingtime (s) | 400 | 200 |
| deltat (s) | 0.04 | 0.04 |
| $\sigma_{az}$ (rad) | 0.001 | 0.001 |
| $\sigma_{el}$ (rad) | 0.0001 | 0.0001 |
| $\sigma_{range}$ (m) | 12.5 | 12.5 |

---

## 四、代码串联叙述

本章 12 个文件按"简化 → 完整 → 工程化"的层次递进：

1. **α-β-γ 跟踪器**（`ghk_tracker.m`）→ 最简单的稳态 Kalman 滤波器，用 $\theta$ 单参数控制跟踪性能。`Fig17_20.m`（$\theta=0.1$ 平滑）和 `Fig17_21.m`（$\theta=0.8$ 灵敏）演示不同 $\theta$ 的行为。

2. **3 状态 Kalman**（`kalman_filter.m`）→ 完整 Kalman 滤波（5 步：增益、更新、协方差更新、预测、外推），加入 Q 矩阵（CA 模型过程噪声）。`Fig17_27.m` 和 `Fig17_28.m` 比较不同噪声条件下的性能。

3. **6 状态 3D Kalman**（`kalfilt.m`）→ 扩展到 3D 位置 + 速度的 6 状态向量，处理 $3 \times 3$ 测量协方差。`PolKal.m` 是 6 状态版的标量简化测试。

4. **3D 跟踪完整演示**（`kalm.m` + `maketraj.m`）→ 端到端流程：轨迹生成 → 加噪 → 6 状态 Kalman 滤波 → 多图组结果展示。

5. **GUI 工具**（`kalman_gui.m`）→ 把 Kalman 跟踪参数化、交互化，方便工程设计。

6. **测试**（`testkalm.m`）→ 验证 `kalfilt.m` 的基本功能。

---

## 五、关键公式汇总

| 公式 | 描述 | 来源 |
|------|------|------|
| $\mathbf{X}_n = \boldsymbol{\Phi} \mathbf{X}$ | 状态预测 | 通用 |
| $\boldsymbol{\Phi} = [1, T, T^2/2; 0, 1, T; 0, 0, 1]$ | CA 状态转移 | Eq.17.x |
| $e = z - \mathbf{X}_n(1)$ | 残差（新息） | 通用 |
| $\alpha = 1 - \theta^3, \beta = 1.5(1+\theta)(1-\theta)^2/T, \gamma = (1-\theta)^3/T^2$ | α-β-γ 增益 | GHK |
| $\mathbf{K} = \mathbf{P}^- \mathbf{H}^T (\mathbf{H} \mathbf{P}^- \mathbf{H}^T + \mathbf{R})^{-1}$ | 卡尔曼增益 | Kalman 核心 |
| $\hat{\mathbf{x}} = \hat{\mathbf{x}}^- + \mathbf{K}(\mathbf{z} - \mathbf{H} \hat{\mathbf{x}}^-)$ | 状态更新 | Kalman |
| $\mathbf{P} = (\mathbf{I} - \mathbf{K}\mathbf{H}) \mathbf{P}^-$ | 协方差更新 | Kalman |
| $\mathbf{P}_{next}^- = \boldsymbol{\Phi} \mathbf{P} \boldsymbol{\Phi}^T + \mathbf{Q}$ | 协方差外推 | Kalman |
| $\mathbf{Q}_{CA} = \sigma_a^2 \begin{bmatrix} T^5/20 & T^4/8 & T^3/6 \\ T^4/8 & T^3/3 & T^2/2 \\ T^3/6 & T^2/2 & T \end{bmatrix}$ | CA 过程噪声 | Eq.17.x |

---

## 六、章节总结

本章 12 个文件完整覆盖了目标跟踪的核心内容：

1. **α-β-γ 跟踪器**（3 个文件）：稳态 Kalman、单参数控制
2. **3 状态 Kalman**（3 个文件）：完整 5 步算法、过程噪声建模
3. **6 状态 3D Kalman**（3 个文件）：3D 位置+速度、工程化演示
4. **辅助函数**（1 个）：轨迹生成 `maketraj.m`
5. **GUI**（1 个）：交互式参数设计
6. **测试**（1 个）：基础功能验证

**学习要点**：
- α-β-γ 是 Kalman 在稳态条件下的简化（$K$ 为常数）
- 完整 Kalman 包含协方差外推和更新
- 过程噪声协方差 Q 决定跟踪响应速度
- 测量噪声协方差 R 决定跟踪平滑度
- Joseph 形式的协方差更新保证 $P$ 对称正定
- 3D 跟踪需要从球坐标 (az, el, range) 转换到笛卡尔坐标

**工程意义**：
- α-β-γ 用于简单、低算力的跟踪场景
- 完整 Kalman 用于高机动目标的精密跟踪
- 交互数据关联（关联波门、最近邻等）是实际系统的下一步
