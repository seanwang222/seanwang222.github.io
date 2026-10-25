---
title: "雷达杂波 · 代码实践"
titleEn: ""
summary: "雷达回波中除了目标信号,还有来自地/海面、建筑物、植被、雨雪等\"非目标\"散射,统称杂波(clutter)。杂波通常比目标回波强得多,是低空雷达和地面雷达的主要干扰源。"
part: "Part III"
chapter: 9
chapterTitle: "雷达杂波"
chapterTitleEn: "Radar Clutter"
section: "0"
kind: "code"
order: 9999
tags: ["雷达系统", "第9章", "代码实践"]
source: "《雷达系统分析与设计（MATLAB版）》第 3 版 · 第 9 章代码"
---

---

## 一、章节概述

雷达回波中除了目标信号,还有来自地/海面、建筑物、植被、雨雪等"非目标"散射,统称**杂波(clutter)**。杂波通常比目标回波强得多,是低空雷达和地面雷达的主要干扰源。

**学习目标**
- 理解面杂波( surface clutter )RCS 的计算方法,`σ_c = σ⁰ · A_clutter`;
- 掌握天线方向图( sinc² vs 高斯 )对杂波照射的影响;
- 学会用雷达方程计算 SNR、CNR、SCR 与 SIR 随距离的分布;
- 了解对数正态( log-normal )分布对杂波统计特性的描述。

---

## 二、代码清单表格

| # | 文件名 | 类型 | 功能简述 | 教材公式/章节号 |
|---|--------|------|----------|---------------|
| 1 | `clutter_rcs.m` | 函数 | 计算地面杂波等效 RCS σ_C(支持 sinc²/高斯方向图 ) | 式 9.7-9.13, 9.4 节 |
| 2 | `Fig9_9.m` | 脚本 | SNR/CNR/SCR 随距离分布( sinc² 方向图 ) | 雷达方程 + 9.5 节 |
| 3 | `Fig9_9_10.m` | 脚本 | 与 Fig9_9 等价( sinc² 方向图 ) | 同上 |
| 4 | `Fig9_10.m` | 脚本 | SNR/CNR/SCR 随距离分布(高斯方向图 ) | 同上 |
| 5 | `Fig9_12_13.m` | 脚本 | 40 个脉冲周期逐距仿真 SNR/CNR/SCR/SIR | 9.5 节 |
| 6 | `Fig9_14.m` | 脚本 | 对数正态杂波 CDF 曲线(三种地形) | 9.6 节 |

---

## 三、核心代码详解

### 3.1 `clutter_rcs.m` —— 地面杂波等效 RCS(核心函数)

这是 Chap 9 的"基石函数",**所有 Fig9_x.m 都调用它**。其核心思想:把面杂波离散化,先求每个距离分辨单元在地面投影的面积 `A`,乘以单位面积后向散射系数 `σ⁰`,再考虑方向图照射,得到该分辨单元的总 RCS。

```matlab
function sigmaC = clutter_rcs(sigma0, thetaE, thetaA, SL, range, hr, ht, b, ant_id)
    thetaA = thetaA * pi/180;
    thetaE = thetaE * pi/180;
    re = 6371000;                                    % 真实地球半径
    rh = sqrt(8.0*hr*re/3);                          % 雷达地平线距离
    SLv = 10^(SL/10);                                % 副瓣电平 线性化
    sigma0v = 10^(sigma0/10);                        % σ⁰ 线性化
    deltar = 3e8 / 2 / b;                            % ΔR = c/(2B)
    range_m = 1000 .* range;                         % km -> m

    thetar = asin(hr ./ range_m);                    % 雷达到杂波单元的仰角
    thetae = asin((ht - hr) ./ range_m);             % 雷达到目标的仰角
    propag_atten = 1 + (range_m./rh).^4;             % 地球曲率衰减(式 9.13)
    Rg = range_m .* cos(thetar);                     % 地面距离
    deltaRg = deltar .* cos(thetar);                 % 地面分辨单元
    theta_sum = thetae + thetar;                     % 相对主瓣偏角

    % 方向图选择
    if ant_id == 1                                    % sinc² 方向图
        ant_arg = theta_sum ./ (pi*thetaE);
        gain = (sinc(ant_arg)).^2;
    else                                              % 高斯方向图
        gain = exp(-2.776 * (theta_sum./thetaE).^2);
    end

    sigmac = (sigma0v .* Rg .* deltaRg) .* ...
             (pi*SLv^2 + thetaA .* gain.^2) ./ propag_atten;   % 式 9.7
    sigmaC = 10*log10(sigmac);                        % 转为 dBsm
end
```

**关键解读**

1. **分辨单元投影面积**:`Rg · ΔRg` 是斜距分辨单元 `ΔR` 在地面的投影。`θ_R = asin(hr/R)` 是雷达到杂波单元的仰角,所以 `Rg = R·cos θ_R`、`ΔRg = ΔR·cos θ_R`。

2. **方向图加权**:`pi*SL² + θ_A·G²(θ)`。第一项 `π·SL²` 是**副瓣各向同性近似**:假设副瓣对全方位均匀照射,总副瓣功率为 `π·SL²`(立体角 4π,主瓣峰值 1 时的归一化);第二项 `θ_A·G²(θ)` 是**主瓣定向照射**:主瓣立体角近似为 `θ_A·θ_E`,加权主瓣方向图平方。

3. **地球曲率衰减**:`propag_atten = 1 + (R/R_h)⁴` 是经验修正,模拟地球曲面对远距离杂波的遮挡,避免远区杂波过强。`R_h = sqrt(8·hr·re/3)` 是雷达地平线距离(4/3 等效地球模型)。

4. **方向图参数化**:
   - sinc² 方向图:`G(θ) = sinc(θ/(πθ_E))²`(MATLAB 中 `sinc(x) = sin(πx)/(πx)`)
   - 高斯方向图:`G(θ) = exp(-2.776·(θ/θ_E)²)`,使其 3 dB 带宽恰好为 `θ_E`

### 3.2 `Fig9_9.m` / `Fig9_9_10.m` —— 距离域快速评估

两者内容实质相同(都用 sinc² 方向图),是图 9.9 的两个版本。核心调用:

```matlab
[sigmmaC] = clutter_rcs(sigmma0, theta_EL, theta_AZ, SL, range, hr, ht, B, 1);  % ant_id=1
sigmmaC = 10.^(sigmmaC./10);                          % 转线性

% 雷达方程
CNR = pt*g*g*lambda^2 .* sigmmaC ./ ((4*pi)^3 .* (range_m).^4 .* k*T0*F*Lt*B);
SNR = pt*g*g*lambda^2 .* sigmmat  ./ ((4*pi)^3 .* (range_m).^4 .* k*T0*F*L*B);
SCR = SNR ./ CNR;                                     % 信杂比
SIR = SNR ./ (1 + CNR);                               % 信干比(同时考虑噪声+杂波)
```

**典型参数**( 5 GHz, 5 MW 峰值, 1 µs 脉宽, 3 m 雷达高, 150 m 目标高 ):
- σ_t = -10 dBsm,σ⁰ = -20 dB,SL = -25 dB
- G ≈ 26000/(θ_AZ · θ_EL) = 26000/3 ≈ 8667

**关键现象**
- **CNR 随距离下降比 SNR 慢**:因为杂波 RCS 随 R 增大(分辨单元面积增大),部分抵消了 1/R⁴ 衰减,导致远区 SCR 反而变差(目标被杂波淹没)。
- **SIR ≈ SNR/(1+CNR)**:当 CNR >> 1 时,SIR ≈ 1/CNR,系统进入"杂波限制"状态。

### 3.3 `Fig9_10.m` —— 高斯方向图版本

与 Fig9_9 唯一区别:`ant_id=2`。高斯方向图在主瓣附近衰减更平滑,副瓣更圆滑地过渡;在远距离,主瓣贡献小,副瓣差异主导,两条 CNR 曲线在 30 km 以外出现明显分歧。

### 3.4 `Fig9_12_13.m` —— 逐脉冲周期仿真

这是 Chap 9 最完整的脚本,真实模拟**多脉冲探测**:

```matlab
re = 6371000 * 4/3;                                  % 4/3 等效地球半径
delr = c * tau / 2;                                  % 距离分辨单元
Rh = sqrt(2*re*hr);                                  % 雷达地平线
R1 = [2*delr : delr : c/2*(T-tau)];                  % 一个 PRI 的距离采样
Rclut = sqrt(R1.^2 + hr^2);                          % 杂波单元斜距

for j = 0:40                                          % 40 个发射脉冲
    Rtgt = [c/2*(j*T+2*tau) : delr : c/2*((j+1)*T-tau)];
    thetaR = asin(hr./Rclut);
    thetae = theta_ref * pi/180;                     % 遮挡角
    d = Rclut .* cos(thetaR);
    del_d = delr .* cos(thetaR);
    theta_sum = thetaR + thetae;
    if ant_id == 1
        gain = (sinc(theta_sum./(pi*theta_EL/180))).^2;
    else
        gain = exp(-2.776*(theta_sum./(pi*theta_EL/180)).^2);
    end
    sigmmac = (pi*SL^2 + (theta_AZ*pi/180).*gain.*sigmma0.*d.*del_d) ./ (1+(Rclut/Rh).^4);
    CNR = P*G*G*lambda^2 .* sigmmac ./ ((4*pi)^3 .* Rclut.^4 .* k*T0*F*L*B);
    SNR = P*G*G*lambda^2 .* sigmmat ./ ((4*pi)^3 .* Rtgt.^4  .* k*T0*F*L*B);
    SCR = SNR ./ CNR;
    SIR = SNR ./ (1+CNR);
    % 画 4 个子图
end
```

**与 Fig9_9/9.10 的关键区别**:
- 显式包含**遮挡角 `theta_ref = 0.75°`**:这是雷达天线仰角指向,代表雷达对地面杂波的"下俯角";
- 4 条曲线(SNR/CNR/SCR/SIR)同时画;
- 用 `Rclut` 表达杂波单元距离,`Rtgt` 表达目标距离,两者解耦;
- 用 `(1 + (R_clut/R_h)⁴)` 修正地球曲率遮挡。

**输出**:4 个子图(snr/cnr/scr/sir vs 距离,km),40 个脉冲叠加。

### 3.5 `Fig9_14.m` —— 对数正态杂波统计

对数正态( log-normal )分布是杂波幅度最常用的非高斯模型之一(尤其陆地杂波):

$$
\sigma^0(P) = \sigma_m + 1.5917\cdot a + 10\cdot a\cdot\log_{10}(-\ln(1-P))
$$

```matlab
P = linspace(0.001, 0.999, 10000);
% 强杂波(城市/山地)
sigmam = -47.75; a = 3.3;
sigmao = sigmam + 1.5917*a + 10*a.*log10(-log(1-P));

% 中等杂波(树林/粗糙海面)
sigmam = -38; a = 1.75;
sigmao = sigmam + 1.5917*a + 10*a.*log10(-log(1-P));

% 弱杂波(平静海面/草地)
sigmam = -29.8; a = 1.1;
sigmao = sigmam + 1.6917*a + 10*a.*log10(-log(1-P));
```

**参数解读**
- `a` 是形状参数,越大拖尾越严重(出现强散射点概率越高);
- `σ_m` 是杂波中值(dB);
- `1.5917 = ln(10)/sqrt(2)`,是 log-normal CDF 反函数的近似系数;
- `1.6917` 是教材笔误(应为 1.5917),保留原样。

**工程意义**:
- a=1.1:接近瑞利分布的弱杂波;
- a=1.75:中等杂波;
- a=3.3:强杂波,需用 CFAR 等高级检测方法对抗。

---

## 四、代码串联叙述

### 4.1 主线:从 σ⁰ 到 SCR

```
σ⁰(dB) [Fig9_14:杂波统计模型]
    │
    ▼
clutter_rcs(σ⁰, θ_E, θ_A, SL, R, hr, ht, B, ant_id)   →  σ_C (dBsm)
    │
    ▼
[Fig9_9/9_10/9_12_13: 代入雷达方程]
    │  SNR = (Pt·G²·λ²·σ_t) / ((4π)³·k·T₀·F·L·B·R⁴)
    │  CNR = (Pt·G²·λ²·σ_C) / ((4π)³·k·T₀·F·L·B·R⁴)
    │  SCR = SNR / CNR
    │  SIR = SNR / (1 + CNR)
    ▼
[图示: SNR/CNR/SCR/SIR 随距离的分布]
```

### 4.2 三种仿真精度的对比

| 精度 | 文件 | 距离采样 | 脉冲数 | 适用场景 |
|------|------|---------|--------|---------|
| 快速估算 | `Fig9_9.m`、`Fig9_10.m` | 距离向量(单值) | 单脉冲 | 总体趋势、参数扫描 |
| 真实仿真 | `Fig9_12_13.m` | 逐 PRI 距离采样 | 40 个脉冲 | 包络细节、MTI 之前的基线 |

### 4.3 方向图的对比意义

- `Fig9_9` (sinc²) vs `Fig9_10` (高斯)对比展示了**方向图模型对杂波分析的敏感性**;
- 工程上应使用实测方向图或更精确的解析模型(如 Taylor 分布、余弦分布);
- 副瓣电平 SL 是最关键参数:每降 10 dB,CNR 降约 20 dB(因为公式中 `SL²`)。

### 4.4 杂波统计与检测的衔接

`Fig9_14.m` 给出的 log-normal 杂波统计是 Chap 13 Swerling 起伏目标模型的"对偶":
- 目标起伏 → Swerling 1~4 描述;
- 杂波幅度起伏 → log-normal / Weibull / K 分布描述;
- 两者结合才能给出真实的虚警概率与检测概率。

---

## 五、关键公式汇总

### 5.1 杂波 RCS(9.4 节)

$$
\sigma_C = \frac{\sigma^0 R_g \Delta R_g \left[\pi SL^2 + \theta_A G^2(\theta_e+\theta_R)\right]}{1+(R/R_h)^4}
$$

其中:
- $R_g = R\cos\theta_R$ — 地面距离
- $\Delta R_g = \Delta R \cos\theta_R$ — 地面分辨单元
- $\Delta R = c/(2B)$ — 斜距分辨单元
- $R_h = \sqrt{8h_r r_e/3}$ — 雷达地平线
- $G(\theta)$ — 天线方向图

### 5.2 方向图( 9.4 节 )

sinc²:
$$
G(\theta) = \left[\frac{\sin(\pi\theta/\theta_E)}{\pi\theta/\theta_E}\right]^2
$$

高斯:
$$
G(\theta) = \exp\left[-2.776\left(\frac{\theta}{\theta_E}\right)^2\right]
$$

### 5.3 雷达方程( 9.5 节 )

$$
SNR = \frac{P_t G^2 \lambda^2 \sigma_t}{(4\pi)^3 R^4 k T_0 F L B}
$$

$$
CNR = \frac{P_t G^2 \lambda^2 \sigma_C}{(4\pi)^3 R^4 k T_0 F L B}
$$

### 5.4 杂波/干信比( 9.5 节 )

$$
SCR = \frac{SNR}{CNR}, \quad SIR = \frac{SNR}{1+CNR}
$$

### 5.5 对数正态杂波( 9.6 节 )

CDF 反函数:
$$
\sigma^0(P) = \sigma_m + 1.5917\,a + 10\,a\,\log_{10}\left(-\ln(1-P)\right)
$$

---

## 六、章节总结

1. **杂波 RCS 由 σ⁰ 投影面积 × 方向图加权**三部分构成,缺一不可;`clutter_rcs.m` 把这三部分用一次函数调用表达,适合作为后续杂波分析的"积木"。

2. **CNR 随距离下降比 SNR 慢**:这是低空雷达的"通病"。远距离目标(50 km 外)在 1 m² RCS 情况下,CNR 仍然可以比 SNR 大 30~40 dB,**必须用 MTI/PD 雷达 + CFAR 才能检测**。

3. **方向图模型影响显著**:sinc² 在主瓣外有可见副瓣结构,高斯更平滑。副瓣电平 SL 是关键:每改善 10 dB,CNR 下降 20 dB。

4. **地球曲率遮挡**用 `(1 + (R/R_h)⁴)` 简化,适合工程估算;在长距离(> R_h)杂波被自动衰减为 0,与物理直觉一致。

5. **杂波统计**应使用 log-normal / Weibull / K 分布,瑞利分布只在散射体极多且均匀时适用(高分低分辨雷达)。`Fig9_14.m` 的三条曲线可作为 CFAR 设计时虚警率分析的输入。

6. **本章为后续 MTI 奠定基础**:Chap 10 的 MTI/PD 雷达就是为了对抗本章计算的杂波,二者形成"杂波分析 → 杂波抑制"的完整链条。
