---
title: "战术合成孔径雷达 · 代码实践"
titleEn: ""
summary: "本章通过一个紧凑的 Fig18 12 13.m 文件完整演示了 Spotlight SAR（聚束式合成孔径雷达）的成像流程。代码基于矩形数据采集格式（Rectangular Format），结合 HRR（High Range Resolut…"
part: "Part V"
chapter: 18
chapterTitle: "战术合成孔径雷达"
chapterTitleEn: "Tactical Synthetic Aperture Radars"
section: "0"
kind: "code"
order: 18999
tags: ["雷达系统", "第18章", "代码实践"]
source: "《雷达系统分析与设计（MATLAB版）》第 3 版 · 第 18 章代码"
---

---

## 一、章节概述

本章通过一个紧凑的 `Fig18_12_13.m` 文件完整演示了 **Spotlight SAR（聚束式合成孔径雷达）** 的成像流程。代码基于矩形数据采集格式（Rectangular Format），结合 **HRR（High Range Resolution，高分辨距离）** 步进频率波形和合成孔径方位压缩，给出最终的 SAR 灰度图像。

### 学习目标
1. 掌握聚束 SAR 的两步压缩流程：距离压缩 + 方位压缩
2. 理解步进频率 HRR 波形合成高分辨距离像
3. 理解聚焦（Focusing）二次相位补偿
4. 掌握合成孔径形成原理：等效大孔径的方位高分辨

---

## 二、代码清单表格

| # | 文件名 | 功能简述 | 教材公式/章节 |
|---|--------|----------|--------------|
| 1 | `Fig18_12_13.m` | Spotlight SAR 矩形格式成像模拟（含距离压缩+聚焦+方位压缩） | §18.4 / Fig 18.3 / Eq.18.x |

---

## 三、核心代码详解

### 3.1 `Fig18_12_13.m` - 聚束 SAR 成像（核心文件）

**作者**：Dr. Brian J. Smith, 2003-06-13
**功能**：从原始回波模拟到最终 SAR 图像的完整 SAR 处理链。

#### 3.1.1 SAR 系统参数

```matlab
% 分辨率指标
dr = 0.50;     % 距离分辨率 (m)
da = 0.10;     % 方位分辨率 (m)

% 散射点位置 (3 个点目标)
xn = [10000 10015 9985];   % X 坐标（距离向）
yn = [0 -20 20];            % Y 坐标（方位向）
Num_Scatter = 3;
Rnom = 10000;               % 参考距离

% 雷达参数
f_0 = 35.0e9;   % 起始频率 (Hz)
df = 3.0e6;     % 步进频率 (Hz)
c = 3e8;        % 光速
Kr = 1.33;      % 带宽系数

% 步进频率脉冲数
Num_Pulse = 2^(round(log2(Kr*c/(2*dr*df))));   % 这里 Num_Pulse = 16
Lambda = c/(f_0 + Num_Pulse*df/2);

% 合成阵列参数
du = 0.2;        % 合成阵列位置步进 (m)
L = round(Kr*Lambda*Rnom/(2*da));  % 合成孔径长度
U = -(L/2):du:(L/2);
Num_du = length(U);
```

**参数推算**：
- 距离分辨率 $d_r = c/(2 \cdot N_{pulse} \cdot df)$
- 方位分辨率 $d_a = \lambda R / (2 L)$，故合成孔径 $L = K_r \lambda R / (2 d_a)$

#### 3.1.2 原始回波生成

**目标回波模型**（步进频率 SAR 几何）：

对于第 $I$ 个合成阵列位置、第 $J$ 个频率步进、第 $K$ 个散射点：

$$
Y_r = y_n(K) - \left[(I-1)d_u - L/2\right]
$$

$$
R_t = \sqrt{x_n(K)^2 + Y_r^2} \quad \text{(瞬时斜距)}
$$

$$
F_{ci} = f_0 + (J-1) \Delta f \quad \text{(步进频率)}
$$

$$
\phi = -\frac{4\pi R_t F_{ci}}{c} \quad \text{(双程相位)}
$$

$$
IQ_{raw}(J, I) = \sum_{K=1}^{N_{scatter}} e^{j\phi}
$$

```matlab
for I = 1:Num_U       % 合成阵列位置
    for J = 1:Num_Pulse  % 频率步进
        for K = 1:Num_Scatter
            Yr = yn(K) - ((I-1)*du - (L/2));
            Rt = sqrt(xn(K)^2 + Yr^2);
            F_ci = f_0 + (J-1)*df;
            PHI = -4*pi*Rt*F_ci/c;
            I_Temp = cos(PHI) + I_Temp;
            Q_Temp = sin(PHI) + Q_Temp;
        end
        IQ_Raw(J,I) = I_Temp + i*Q_Temp;
        I_Temp = 0.0;
        Q_Temp = 0.0;
    end
end
```

**`IQ_Raw` 矩阵**：尺寸 (Num_Pulse × Num_U) = (16 × ~50)，即步进频率 × 方位位置。

#### 3.1.3 距离压缩（Range Compression）

**核心思想**：步进频率合成通过 **IFFT + Hamming 窗** 实现距离高分辨。

```matlab
% 距离压缩
Num_RB = 2*Num_Pulse;        % 补零到 32 点
WR = hamming(Num_Pulse);     % 16 点 Hamming 窗
for I = 1:Num_U
    Range_Compressed(:,I) = fftshift(ifft(IQ_Raw(:,I).*WR, Num_RB));
end
```

**等价数学**：
$$
\text{Range\_Compressed}(r, I) = \text{IFFT}\left\{IQ_{raw}(f, I) \cdot W(f)\right\} \cdot e^{j\phi_{focus}}
$$

其中 $W(f)$ 是 Hamming 窗频域形式。

**为什么 IFFT 能距离压缩？**：
- 步进频率等价于频率步进的脉冲串
- 每个频点采样对应一个频率分量
- IFFT = 频率域到时延域的转换 = 距离域

#### 3.1.4 聚焦（Focusing）二次相位补偿

**核心思想**：由于 SAR 几何，目标在方位上随位置变化有二次相位（距离徙动），需要补偿。

**聚焦相位**：
$$
\phi_{focus}(n) = -\frac{2\pi d_n^2}{\lambda x_n(1)}
$$

其中 $d_n = n \cdot d_u - L/2$ 是阵列位置偏移。

```matlab
% 聚焦
dn = (1:Num_U)*du - L/2;
PHI_Focus = -2*pi*(dn.^2)/(Lambda*xn(1));
for I = 1:Num_RB
    Temp = angle(Range_Compressed(I,:)) - PHI_Focus;
    Focused(I,:) = abs(Range_Compressed(I,:)).*exp(i*Temp);
end
```

**关键技巧**：仅修改相位，保留幅度（不改变距离压缩结果），补偿 SAR 几何引入的二次相位。

#### 3.1.5 方位压缩（Azimuth Compression）

**核心思想**：合成孔径雷达通过相干积累形成"等效大孔径"，实现方位向高分辨。

$$
\text{AZ\_Compressed}(r, y) = \text{IFFT}\left\{\text{Focused}(r, n) \cdot W(n)\right\}
$$

```matlab
% 方位压缩
WA = hamming(Num_U);
for I = 1:Num_RB
   AZ_Compressed(I,:) = fftshift(ifft(Focused(I,:).*WA'));
end
```

#### 3.1.6 SAR 图像显示

```matlab
% 转 dB
SAR_Map = 10*log10(abs(AZ_Compressed));
% 坐标标定
Y_Temp = (1:Num_RB)*(c/(2*Num_RB*df));
Y = Y_Temp - max(Y_Temp)/2;          % 距离向 (Down Range)
X_Temp = (1:length(IQ_Raw))*(Lambda*xn(1)/(2*L));
X = X_Temp - max(X_Temp)/2;          % 方位向 (Cross Range)
% 显示
image(X, Y, 20-SAR_Map);
axis([-25 25 -25 25]);
axis equal;
colormap(gray(64));
xlabel('Cross Range (m)');
ylabel('Down Range (m)');
grid
```

**坐标物理意义**：
- **Down Range**（Y 轴）：实际距离，单位 m（从最近距离算起）
- **Cross Range**（Y 轴）：方位向实际距离
- `20 - SAR_Map`：将 dB 范围限制在 [0, 20]

---

## 四、代码串联叙述

`Fig18_12_13.m` 自身就是一个完整的 SAR 处理链：

```
┌──────────────────┐
│  原始回波 IQ_Raw  │ (16频率步进 × 50方位位置 × 3散射点叠加)
└────────┬─────────┘
         ↓
┌──────────────────┐
│  距离压缩         │ ifft(IQ_Raw · Hamming) → 距离高分辨
└────────┬─────────┘
         ↓
┌──────────────────┐
│  聚焦             │ 补偿二次相位 e^(-2π d²/λx)
└────────┬─────────┘
         ↓
┌──────────────────┐
│  方位压缩         │ ifft(Focused · Hamming) → 方位高分辨
└────────┬─────────┘
         ↓
┌──────────────────┐
│  SAR 图像显示     │ image() + gray 调色板
└──────────────────┘
```

**关键点**：
1. **HRR 步进频率**：用 16 个窄脉冲（间隔 3 MHz）合成等效带宽 = 48 MHz，对应 $d_r = c/(2B) \approx 3.1$ m
2. **合成孔径**：$L = K_r \lambda R / (2 d_a) \approx 1.33 \times (0.0086/0.04) \times 10000/(2 \times 0.1) \approx 10$ m
3. **两次 IFFT**：第一次（距离向）将频率域转为距离域，第二次（方位向）将方位位置转为实际角度/距离

---

## 五、关键公式汇总

| 公式 | 描述 | 来源 |
|------|------|------|
| $R_t = \sqrt{x_n^2 + Y_r^2}$ | 瞬时斜距 | SAR 几何 |
| $\phi = -4\pi R_t F_{ci} / c$ | 双程相位 | 物理 |
| $IQ_{raw}(J,I) = \sum_K e^{j\phi}$ | 原始回波 | 叠加 |
| $d_r = c/(2 N_{pulse} \Delta f)$ | 距离分辨率 | HRR |
| $d_a = \lambda R / (2L)$ | 方位分辨率 | SAR |
| $\phi_{focus} = -2\pi d_n^2 / (\lambda x_n)$ | 二次相位补偿 | 聚焦 |
| $D = \text{IFFT}\{IQ_{raw} \cdot W\}$ | 距离压缩 | HRR 匹配滤波 |
| $F = \text{IFFT}\{D \cdot e^{j\phi_{focus}}\}$ | 聚焦 | 二次补偿 |
| $I = \text{IFFT}\{F \cdot W\}$ | 方位压缩 | 合成孔径 |

---

## 六、章节总结

本章虽然只有 1 个文件，但完整地演示了聚束 SAR 的核心算法。

**学习要点**：
1. **HRR 步进频率**：用窄脉冲串合成大带宽，从而获得高距离分辨率
2. **距离压缩**：对每个方位位置做 IFFT，得到距离剖面
3. **SAR 几何相位**：在 SAR 中，目标距离随方位位置变化（$R_t = \sqrt{x_n^2 + Y_r^2}$），引入二次相位
4. **聚焦补偿**：用 $\phi_{focus} = -2\pi d_n^2/(\lambda x_n)$ 补偿二次相位
5. **方位压缩**：相干积累形成等效大孔径，获得高方位分辨率
6. **两次 FFT/IFFT**：距离向 + 方位向各一次，构成本质上的 2D 图像处理

**工程意义**：
- Spotlight SAR 可获得厘米级方位分辨率
- 矩形数据采集格式是工程上最常用的格式
- Hamming 窗用于抑制距离/方位旁瓣
- 实际 SAR 还需考虑：距离徙动校正（RCMC）、运动补偿（MoComp）、多视处理等

**关于本章其他可能内容**：
- 本代码目录只有 `Fig18_12_13.m` 一个文件
- 教材第 18 章其他图（Fig 18.5, Fig 18.7, Fig 18.10 等）的代码未在 `01_CodeCollection` 中提供
- 读者可基于本文件框架扩展到 Stripmap SAR、ScanSAR 等其他模式
