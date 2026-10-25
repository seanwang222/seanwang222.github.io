---
title: "自适应信号处理 · 代码实践"
titleEn: ""
summary: "本章系统讲述 Adaptive Signal Processing（自适应信号处理）在雷达中的应用。核心内容包括三大部分："
part: "Part V"
chapter: 16
chapterTitle: "自适应信号处理"
chapterTitleEn: "Adaptive Signal Processing"
section: "0"
kind: "code"
order: 16999
tags: ["雷达系统", "第16章", "代码实践"]
source: "《雷达系统分析与设计（MATLAB版）》第 3 版 · 第 16 章代码"
---

---

## 一、章节概述

本章系统讲述 **Adaptive Signal Processing（自适应信号处理）** 在雷达中的应用。核心内容包括三大部分：
1. **LMS（Least Mean Square）自适应滤波**——时间域滤波
2. **自适应阵列（Adaptive Array）**——空域滤波、旁瓣对消
3. **STAP（Space-Time Adaptive Processing）**——空时二维联合处理

代码层面以 LMS 算法、空时导向矢量构造、协方差矩阵估计为主线。

### 学习目标
1. 掌握 LMS 权值更新公式 $w(n+1) = w(n) + 2\mu e(n) x(n)$
2. 理解 MVDR/LCMV 最优权向量 $w_{opt} = R^{-1} a(\theta)$
3. 掌握空时导向矢量的 Kronecker 积结构 $a = b_M \otimes a_N$
4. 理解 STAP 杂波对消原理

---

## 二、代码清单表格

| # | 文件名 | 功能简述 | 教材公式/章节 |
|---|--------|----------|--------------|
| 1 | `LMS.m` | 归一化 LMS（NLMS）FIR 自适应滤波 | Eq.16.x (LMS) |
| 2 | `leastms.m` | LMS 的另一种循环结构实现 | Eq.(11.66) |
| 3 | `Fig16_4_5.m` | LMS 去噪演示（Fig 16.4 / 16.5） | 演示脚本 |
| 4 | `adaptive_array_lms.m` | 自适应阵列 LMS 旁瓣对消 | §16.6, MVDR |
| 5 | `st_steering_vector.m` | N×M 空时导向矢量 | Kronecker 积 |
| 6 | `smaa_st_steering_vector.m` | SMAA 空时导向矢量（2N-1 维） | SMAA 算法 |
| 7 | `ts_weighting.m` | 三角加权向量生成 | 三角加权 |
| 8 | `stap.m` | 基础 STAP 实现 | §16.x (STAP) |
| 9 | `stap_std.m` | STAP 标准版（杂波+目标+干扰） | §16.x (STAP) |
| 10 | `stap_smaa.m` | STAP SMAA 版 | §16.x (STAP) |
| 11 | `run_stap.m` | STAP 演示（调用 std 与 smaa） | 演示脚本 |

---

## 三、核心代码详解

### 3.1 `LMS.m` - 归一化 LMS 自适应 FIR 滤波

**核心算法**（NLMS）：
1. **滤波器输出**：
$$
y(n) = \sum_{k=0}^{L} w_k(n) \cdot x(n-k)
$$
2. **估计误差**：
$$
e(n) = d(n) - y(n)
$$
3. **归一化 LMS 权值更新**：
$$
w(n+1) = w(n) + \frac{2\mu}{(L+1)\sigma^2(n)} e(n) x(n)
$$
4. **功率估计**（指数遗忘）：
$$
\sigma^2(n) = \alpha |x(n)|^2 + (1-\alpha)\sigma^2(n-1)
$$

**关键代码**：
```matlab
function Xout = LMS(Xin, D, B, mu, sigma, alpha)
N = size(Xin,2);
L = size(B,2)-1;       % FIR 阶数
px = B;                % 移位寄存器
for k = 1:N
    px(1) = Xin(k);                          % 新样本入队
    Xout(k) = sum(B.*px);                    % 卷积输出
    E = D(k) - Xout(k);                      % 误差
    sigma = alpha*(px(1)^2) + (1 - alpha)*sigma;   % 功率估计
    tmp = 2*mu/((L+1)*sigma);                % 归一化步长
    B = B + tmp*E*px;                        % 权值更新
    px(L+1:-1:2) = px(L:-1:1);               % 移位
end
```

**物理意义**：通过最速下降法使均方误差 $E\{|e(n)|^2\}$ 最小，归一化使步长与输入功率无关。

---

### 3.2 `leastms.m` - LMS 另一种实现

**与 `LMS.m` 区别**：
- 使用 `for k = 1, n` 这种 MATLAB 逗号表达式循环
- 显式维护 `pxk(1..L)` 移位寄存器
- 与 Eq.(11.66) 完全对应

**关键代码片段**：
```matlab
pxk = zeros(1,n);
for k = 1, n
    pxk(1) = xk(k);
    xk(k) = 0;
    for ll = 1, L
        xk(k) = xk(k) + bk(ll) * pxk(ll);
    end
    error = dk(k) - xk(k);
    sigmma = alpha * pxk(1)^2  + (1-alpha) * sigmma;
    val = 2 * mu / (L+1) / sigmma;
    for ll = 1,L
        bk(ll) = bk(ll) + val * error * pxk(ll);
    end
    for ll = L:-1:2
        pxk(ll) = pxk(ll-1);
    end
end
```

---

### 3.3 `Fig16_4_5.m` - LMS 去噪演示

**应用场景**：从被噪声污染的信号 $X = D + \sqrt{7}\cdot\text{noise}$ 中提取期望信号 $D = \sqrt{2}\sin(2\pi k/20)$。

**参数**：
- $N = 501$ 样本
- $L = 20$ FIR 阶数
- $\mu = 0.1$ 步长
- $\alpha = 0.1$ 遗忘因子

**代码**：
```matlab
noise = rand(1, length(k)) - .5;
D = sqrt(2)*sin(2*pi*k/20);
X = D + sqrt(7)*noise;
Y = LMS(X, D, B, mu, sigma, alpha);    % X作为输入, D作为参考
```

**输出**：
- 期望信号 $D$（干净正弦）
- 受污染信号 $X$
- LMS 输出 $Y$（去噪后）

---

### 3.4 `adaptive_array_lms.m` - 自适应阵列旁瓣对消

**核心算法**（MVDR / Sample Matrix Inversion）：
$$
w_{opt} = R^{-1} a(\theta_{target}) / (a^H R^{-1} a)
$$

简化实现（对角加载）：
$$
w = R^{-1} a_{target}, \quad R = E\{xx^H\}
$$

**导向矢量**（由 `la_sampled_wave.m` 生成）：
$$
a(\theta) = [1, e^{j 2\pi d \sin\theta/\lambda}, \ldots, e^{j 2\pi (N-1) d \sin\theta/\lambda}]^T
$$

**关键代码**：
```matlab
% 目标和干扰的导向矢量
sine_tgt_angle = sin(tagt_angle *pi/180);
sine_jam_angle = sin(jam_angle*pi/180);
al = la_sampled_wave(N, dol, sine_tgt_angle);   % 目标
jl  = la_sampled_wave(N, dol, sine_jam_angle);  % 干扰
x = al + jl;   % 输入
% 加噪
n = mvnrnd(mu,sigma,N);
jl = jl + complex(n(:,1),n(:,2));
Xl = jl * jl';            % 干扰协方差
Cl = cov(Xl) + eye(N);     % 协方差 + 对角加载（保证可逆）
% 最优权
Wl = inv(Cl) * al;
% 用 linear_array_FFT 画方向图
[G, R, u, theta] = linear_array_FFT(Wl, dol);
```

**输出**：自适应前后方向图对比。在干扰方向 $\theta_{jam}$ 处形成深零点（null），同时保持目标方向 $\theta_{target}$ 的增益。

---

### 3.5 `st_steering_vector.m` - 空时导向矢量

**核心结构**（Kronecker 积）：
$$
\mathbf{a}(\sin\theta, \omega_d) = \mathbf{b}_M(\omega_d) \otimes \mathbf{a}_N(\sin\theta)
$$

**空间导向矢量**（$N$ 阵元）：
$$
\mathbf{a}_N(\sin\theta) = [1, e^{-j\pi\sin\theta}, e^{-j 2\pi\sin\theta}, \ldots, e^{-j (N-1)\pi\sin\theta}]^T
$$

**时域导向矢量**（$M$ 脉冲）：
$$
\mathbf{b}_M(\omega_d) = [1, e^{-j\pi\omega_d}, e^{-j 2\pi\omega_d}, \ldots, e^{-j (M-1)\pi\omega_d}]^T
$$

**关键代码**：
```matlab
function a = st_steering_vector(sintheta, N, wd, M)
a_N = exp(-j*pi*sintheta*[0:N-1]');
b_M = exp(-j*pi*wd      *[0:M-1]');
a = kron(b_M, a_N);   % Kronecker 积
```

**尺寸**：$a \in \mathbb{C}^{NM \times 1}$，对应 $N$ 阵元 × $M$ 脉冲的相干处理间隔。

**注意**：此处用 $\pi$ 而非 $2\pi$，对应 $d/\lambda = 0.5$ 时 $\sin\theta$ 直接作为空间频率输入。

---

### 3.6 `smaa_st_steering_vector.m` - SMAA 空时导向矢量

**SMAA 核心思想**：通过虚拟增加阵元数 ($N \to 2N-1$)，提升空域自由度。

**SMAA 空间导向矢量**（2N-1 维，中心对称）：
$$
\mathbf{a}_N(\sin\theta) = [e^{j\pi(N-1)\sin\theta}, \ldots, 1, \ldots, e^{-j\pi(N-1)\sin\theta}]^T \in \mathbb{C}^{2N-1}
$$

**三角加权**（由 `ts_weighting.m` 提供）：
$$
\mathbf{c} = [1, 2, \ldots, N-1, N, N-1, \ldots, 2, 1]^T \in \mathbb{C}^{2N-1}
$$

**关键代码**：
```matlab
function a = smaa_st_steering_vector(sintheta, N, wd, M)
a_N = exp(-j*pi*sintheta*[-(N-1):+(N-1)]');   % 2N-1 维
b_M = exp(-j*pi*wd      *[0:M-1]');
a_N = a_N .* ts_weighting(N);                  % 三角加权
a = kron(b_M, a_N);
```

**物理意义**：
- 等效阵元数从 $N$ 增加到 $2N-1$（孔径增大 1 倍）
- 三角加权降低空域旁瓣
- 杂波抑制能力提升

---

### 3.7 `ts_weighting.m` - 三角加权

**定义**：
$$
c_k = \begin{cases} k, & k = 1, 2, \ldots, N \\ 2N - k, & k = N+1, \ldots, 2N-1 \end{cases}
$$

**代码**：
```matlab
function c = ts_weighting(N)
c = zeros(2*N-1,1);
c(1:N-1) = [1:N-1];
c(N) = N;
c(N+1:2*N-1) = 2*N-[N+1:2*N-1];
```

**例**：$N=4$ 时 $c = [1, 2, 3, 4, 3, 2, 1]^T$

---

### 3.8 `stap.m` - STAP 基础版本

**核心流程**：
1. 构造杂波协方差矩阵（沿杂波脊积分）：
$$
R_c = \int \sigma_c^2(\theta) \mathbf{a}(\theta) \mathbf{a}^H(\theta) d\theta
$$
2. 估计总协方差（杂波+目标+噪声）：
$$
R = R_c + \sigma_t^2 \mathbf{a}_t \mathbf{a}_t^H + \sigma_n^2 I
$$
3. 计算 STAP 输出功率谱：
$$
P_b(\theta, \omega_d) = |\mathbf{w}^H \mathbf{a}(\theta, \omega_d)|^2
$$

**关键参数**（`stap.m`）：
- $N=10$ 阵元，$M=12$ 脉冲
- CNR=40 dB, SNR=0 dB
- $\beta=1$（杂波脊斜率）, $d/\lambda=0.5$

**杂波脊方程**（平台运动）：
$$
\omega_d = \beta \cdot \phi, \quad \phi = 2(d/\lambda)\sin\theta
$$

**关键代码**：
```matlab
% 杂波协方差矩阵
sintheta = linspace(-1, 1, No);
phi = 2 * dol * sintheta;
wd = beta * phi;
Rc_linear = zeros(N*M);
for k = 1: length(phi)
    a_linear = st_steering_vector(phi(k), N, beta*phi(k), M);
    Rc_linear = Rc_linear + sigma2_c * a_linear * a_linear' + sigma2_n*eye(...);
end
% 对角加载改善条件数
dval = 10;
Rc_linear = Rc_linear + dval * eye(size(Rc_linear));
% 最优权
wopt_linear = inv(Rc_linear) * at_linear;
% 滤波后输出
Pb_linear(mm, nn) = abs(wopt_linear' * a_linear)^2;
```

**输出**：
- `Pb_linear` - 线性阵列 STAP 输出
- `Pb_smaa` - SMAA 阵列 STAP 输出
- `sintheta, wd` - 坐标轴

---

### 3.9 `stap_std.m` - 标准 STAP

**更完整的 STAP 实现**：
1. 计算**未加权的波束形成器输出**（展示总回波谱）：
$$
P_b = a^H R a, \quad R = R_c + R_n + R_{t1} + R_{t2}
$$
2. 估计杂波协方差（用平均）：
$$
R_c = \frac{1}{N_\phi} \sum_k \mathbf{a}(\phi_k) \mathbf{a}^H(\phi_k)
$$
3. 计算**对数似然比**（检测统计量）：
$$
LL(\theta, \omega_d) = \frac{|\mathbf{a}^H R^{-1} (\mathbf{a}_{t1} + \mathbf{a}_{t2} + \mathbf{a}_c)|^2}{\mathbf{a}^H (R_c + R_n) \mathbf{a}}
$$

**关键代码**：
```matlab
% 目标 1 协方差
at1 = sigma_t1 * st_steering_vector(sintheta_t1, N, wd_t1, M);
Rt1 = at1 * at1';
% 目标 2 协方差
at2 = sigma_t2 * st_steering_vector(sintheta_t2, N, wd_t2, M);
Rt2 = at2 * at2';
% 总协方差
R = Rc + Rn + Rt1 + Rt2;
% 未加权波束形成
Pb(mm, nn) = a' * R * a;
% 最优权
Rc = (ac_all * ac_all') / length(phi);
Rinv = inv(Rc + Rn);
wopt = Rinv * (at1 + at2);
% 似然比
LL(mm,nn) = abs(a' * Rinv * (at1+at2+ac_all))^2 / (a' * (Rc + Rn) * a);
```

**输出**：
- `figure(1)`: 总回波谱（imagesc）含目标+干扰+杂波
- `figure(2)`: 总回波谱（surf）
- `LL`: 似然比矩阵（用于检测）

---

### 3.10 `stap_smaa.m` - SMAA STAP

**与 `stap_std.m` 的关键区别**：
- 阵元维度从 $N$ 变为 $2N-1$
- 使用 `smaa_st_steering_vector()` 构造导向矢量
- 三角加权抑制旁瓣

**参数**：
- $N=10$, $N_a = 2N-1 = 19$
- $M=12$, $No=250$ 杂波离散点
- CNR=20 dB, SNR=0 dB, JSR=20 dB

---

### 3.11 `run_stap.m` - STAP 演示脚本

**测试场景**：
- 目标 1: $\sin\theta=0.4, \omega_d=-0.6$（动目标）
- 目标 2 (干扰): $\sin\theta=-0.6, \omega_d=0.2$

**调用流程**：
```matlab
[LL, sintheta, wd] = stap_std(sintheta_t1, wd_t1, sintheta_t2, wd_t2);
LL = LL / max(max(abs(LL)));
LL = max(LL, 1e-6);

% 标准 STAP 检测
figure(3); imagesc(sintheta, wd, 10*log10(abs(LL)));   % 似然比
figure(4); surf(sintheta, wd, 10*log10(abs(LL)));

% SMAA STAP 检测
[LL, sintheta, wd] = stap_smaa(sintheta_t1, wd_t1, sintheta_t2, wd_t2);
figure(5); imagesc(...);
figure(6); surf(...);
```

**输出**：4 个 figure，对比标准 STAP 与 SMAA STAP 的检测性能。

---

## 四、代码串联叙述

本章 11 个文件按"时间域 LMS → 空域自适应 → 空时联合 STAP"的层次递进：

1. **LMS 基础**（`LMS.m`、`leastms.m`）→ 用归一化 LMS 实现自适应 FIR 滤波，归一化步长使算法对信号功率鲁棒。

2. **LMS 应用**（`Fig16_4_5.m`）→ 演示 LMS 用于去噪，从被噪声淹没的正弦信号中提取出期望信号。

3. **空域自适应**（`adaptive_array_lms.m` + `la_sampled_wave.m`）→ 在空域用 $R^{-1} a_{target}$ 求最优权，在干扰方向形成零点。这是 MVDR 波束形成器的样本矩阵求逆（SMI）实现。

4. **空时导向矢量**（`st_steering_vector.m`）→ 用 Kronecker 积构造 $a = b_M \otimes a_N$，是 STAP 的"原子"。

5. **SMAA 增强**（`smaa_st_steering_vector.m` + `ts_weighting.m`）→ 通过虚拟增加阵元数（$N \to 2N-1$）+ 三角加权，提高空域自由度，降低旁瓣。

6. **STAP 完整实现**（`stap.m` → `stap_std.m` → `stap_smaa.m`）→ 三个层次递进：
   - `stap.m`：基础框架，构造协方差 + 对角加载 + 最优权
   - `stap_std.m`：加入干扰和噪声完整协方差，计算未加权波束形成谱和似然比
   - `stap_smaa.m`：用 SMAA 导向矢量增强

7. **STAP 演示**（`run_stap.m`）→ 调用上述函数，输出 4 幅图，对比标准 STAP 与 SMAA STAP 的角度-多普勒检测能力。

---

## 五、关键公式汇总

| 公式 | 描述 | 来源 |
|------|------|------|
| $y(n) = w^T(n) x(n)$ | LMS 输出 | Eq.16.x |
| $e(n) = d(n) - y(n)$ | LMS 误差 | 通用 |
| $w(n+1) = w(n) + 2\mu e(n) x(n)$ | LMS 权值更新 | 核心 |
| $w(n+1) = w(n) + \frac{2\mu}{(L+1)\sigma^2} e(n) x(n)$ | 归一化 LMS | 归一化 |
| $\sigma^2(n) = \alpha \|x(n)\|^2 + (1-\alpha)\sigma^2(n-1)$ | 功率估计 | 通用 |
| $w_{opt} = R^{-1} a(\theta)$ | MVDR/LCMV 最优权 | §16.6 |
| $a(\theta) = [1, e^{j k d \sin\theta}, \ldots]^T$ | 空间导向矢量 | 通用 |
| $a = b_M \otimes a_N$ | 空时导向矢量（Kronecker） | STAP 核心 |
| $R_c = \int \sigma_c^2(\theta) a a^H d\theta$ | 杂波协方差 | 通用 |
| $LL = \|a^H R^{-1} (a_{t1}+a_{t2}+a_c)\|^2 / (a^H (R_c+R_n) a)$ | 对数似然比 | 通用 |
| $c = [1,2,...,N-1,N,N-1,...,2,1]^T$ | 三角加权 | SMAA |

---

## 六、章节总结

本章 11 个文件完整覆盖了自适应信号处理的核心内容：

1. **LMS 算法**（3 个文件）：FIR 自适应滤波 + 去噪演示
2. **空域自适应**（1 个文件）：旁瓣对消
3. **空时导向矢量**（2 个文件）：标准 + SMAA
4. **STAP**（4 个文件）：基础 → 标准 → SMAA → 演示

**学习要点**：
- LMS 通过最速下降法逼近最优 Wiener 解
- 归一化步长 $2\mu/((L+1)\sigma^2)$ 解决了输入功率波动问题
- MVDR/LCMV 最优权：保持目标增益、抑制干扰
- STAP 的本质：把空时二维联合处理看作 $NM$ 维"虚拟阵列"
- SMAA 通过虚拟增加阵元数提高空域自由度

**工程意义**：
- LMS 是 ADPCM/ANC/beamforming 的基础
- STAP 是机载/舰载雷达杂波抑制的核心技术
- 实际系统还需考虑：样本数不足、协方差估计误差、计算复杂度等
