---
title: "雷达截面积 · 代码实践"
titleEn: ""
summary: "本章系统介绍 RCS（Radar Cross Section，雷达截面积）的定义、特性及各类简单目标（球、椭球、圆板、矩形板、圆柱、截锥、三角板、任意多边形）的 RCS 解析/半解析计算方法，以及多次反射（角反射器）效应。代码层面则按\"基础…"
part: "Part V"
chapter: 14
chapterTitle: "雷达截面积"
chapterTitleEn: "Radar Cross Section"
section: "0"
kind: "code"
order: 14999
tags: ["雷达系统", "第14章", "代码实践"]
source: "《雷达系统分析与设计（MATLAB版）》第 3 版 · 第 14 章代码"
---

---

## 一、章节概述

本章系统介绍 **RCS（Radar Cross Section，雷达截面积）** 的定义、特性及各类简单目标（球、椭球、圆板、矩形板、圆柱、截锥、三角板、任意多边形）的 RCS 解析/半解析计算方法，以及多次反射（角反射器）效应。代码层面则按"基础理论 → 简单几何体 → 复杂组合体 → 多次反射"递进展开，同时配以 GUI 程序用于交互式参数设置。

### 学习目标
1. 掌握 RCS 的点散射模型：`|1 + e^(j2πd)|²`
2. 掌握简单几何体的 RCS 解析公式
3. 理解物理光学（PO）法计算平板散射
4. 理解组合体（圆柱+端盖）的非相干叠加
5. 掌握角反射器的多次反射计算

---

## 二、代码清单表格

| # | 文件名 | 功能简述 | 教材公式/章节 |
|---|--------|----------|--------------|
| 1 | `rcs_sphere.m` | 球 RCS 的 Mie 级数精确解 | Eq.(14.28)，三区划分 |
| 2 | `rcs_ellipsoid.m` | 椭球 RCS（一般情况、退化为球） | Eq.(14.32) |
| 3 | `rcs_circ_plate.m` | 圆板 RCS（PO + 等效边缘电流） | Eq.(14.38, 14.39, 14.40) |
| 4 | `rcs_cylinder.m` | 圆/椭圆截面圆柱 RCS | Eq.(14.84, 14.85) |
| 5 | `rcs_cylinder_cmplx.m` | 圆柱+端盖组合体 RCS | 圆柱+端盖合成 |
| 6 | `rcs_rect_plate.m` | 矩形板 RCS（H/V 极化 + PO） | Eq.(14.52, 14.53) |
| 7 | `rcs_frustum.m` | 截锥（圆锥台）RCS | Eq.(14.43) |
| 8 | `rcs_frustum1.m` | 截锥 RCS 实例（双视角） | 同 Eq.(14.43) |
| 9 | `rcs_isosceles.m` | 等腰三角形板 RCS | Eq.(14.65)~(14.67) |
| 10 | `cylinder.m` | 圆截面圆柱 RCS 函数版 | Eq.(14.84, 14.85) |
| 11 | `cylinderi.m` | 圆柱 RCS 调用脚本（9.5 GHz 实例） | 调用 `cylinder.m` |
| 12 | `rectplate.m` | 矩形板散射场 Es 精确计算 | 物理光学积分式 |
| 13 | `polygon.m` | 任意 N 边多边形散射场 | 顶点法 PO 积分 |
| 14 | `makeellip.m` | 椭圆离散点坐标生成（绘图辅助） | 辅助函数 |
| 15 | `rcs_aspect.m` | 两点散射体 RCS 随方位角变化 | `|1+e^(j2πd)|²` |
| 16 | `rcs_frequency.m` | 两点散射体 RCS 随频率变化 | 同上 |
| 17 | `Fig14_3.m` | 复现图 14.3 - 方位依赖 | 调用 `rcs_aspect.m` |
| 18 | `Fig14_5_6.m` | 复现图 14.5/14.6 - 频率依赖 | 调用 `rcs_frequency.m` |
| 19 | `Fig14_10.m` | 复现图 14.10 - 球体三区 | 等价 `rcs_sphere.m` |
| 20 | `Fig14_12a.m` | 复现图 14.12(a) - 椭球多滚转角 | 调用 `rcs_ellipsoid.m` |
| 21 | `Fig14_19.m` | 复现图 14.19 - 圆/椭圆截面圆柱 | 调用 `rcs_cylinder.m` |
| 22 | `rcs_circ_plate_gui.m` | 圆板 RCS GUI 驱动 | GUI → `rcs_circ_plate.m` |
| 23 | `rcs_ellipsoid_gui.m` | 椭球 RCS GUI 驱动 | GUI → `rcs_ellipsoid.m` |
| 24 | `rcs_frustum_gui.m` | 截锥 RCS GUI 驱动（老版） | GUI → `rcs_frustum.m` |
| 25 | `rcs_frustum_driver.m` | 截锥 RCS GUI 加载器（新版） | 同上 |
| 26 | `rcs_isosceles_gui.m` | 等腰三角板 RCS GUI 驱动 | GUI → `rcs_isosceles.m` |
| 27 | `rcs_rect_plate_gui.m` | 矩形板 RCS GUI 驱动 | GUI → `rcs_rect_plate.m` |

---

## 三、核心代码详解

### 3.1 `rcs_sphere.m` - 球体 Mie 级数解

**功能**：完美导体球的后向 RCS，覆盖瑞利、Mie、光学三个频率区。

**核心公式**（球面 Bessel 级数递推）：
$$
\frac{\sigma}{\pi a^2} = \left| \sum_{n=1}^{\infty} \frac{(-1)^n (2n+1)}{H_n^{(2)}(k_r) \frac{\partial}{\partial k_r}[k_r H_n^{(2)}(k_r)]} \right|^2
$$

其中 $H_n^{(2)}$ 为第二类球面 Hankel 函数，通过递推关系计算。

**代码片段**：
```matlab
% 球面 Bessel 函数的递推
while(abs(del) > eps)
   q   = -q;
   n   = n + 1;
   m   = m + 2;
   del = (2.*n-1) * f2 / kr-f1;   % Hankel 递推
   f1  = f2;
   f2  = del;
   del = q * m /(f2 * (kr * f1 - n * f2));
   sphere_rcs = sphere_rcs + del; % 级数累加
end
rcs(index) = abs(sphere_rcs);
```

**输出**：绘制 $\sigma/\pi a^2$ 随 $k_r = 2\pi a / \lambda$ 变化曲线，可清晰看到三区过渡。

---

### 3.2 `rcs_ellipsoid.m` - 椭球 RCS 通用公式

**核心公式**（Eq.14.32）：
$$
\sigma(\theta,\phi) = \frac{\pi a^2 b^2 c^2}{\left[a^2 \cos^2\phi \sin^2\theta + b^2 \sin^2\phi \sin^2\theta + c^2 \cos^2\theta\right]^2}
$$

**关键代码段**：
```matlab
if(a ~= b & a ~= c)
   rcs = (pi * a^2 * b^2 * c^2) ./ (a^2 * cos_phi_s .* (sin(theta).^2) + ...
      b^2 * sin_phi_s .* (sin(theta).^2) + ...
      c^2 .* (cos(theta).^2)).^2 ;
else
   if(a == b & a ~= c)  % 旋转椭球
      rcs = (pi * b^4 * c^2) ./ ( b^2 .* (sin(theta).^2) + ...
         c^2 .* (cos(theta).^2)).^2 ;
   else
      if (a == b & a ==c)   % 球
         rcs = pi * c^2;     % 退化为 sigma = pi*a^2
      end
   end
end
rcs_db = 10.0 * log10(rcs);
```

**意义**：当 $a=b=c$ 时，自动退化为 `rcs_sphere.m` 的光学区公式 $\sigma = \pi a^2$。

---

### 3.3 `rcs_circ_plate.m` - 圆形平板 RCS

**核心公式**（PO 法 Eq.14.39）：
$$
\sigma = \frac{4\pi^3 r^4}{\lambda^2}\left[\frac{2 J_1(k_r \sin\theta)}{k_r \sin\theta}\cos\theta\right]^2
$$

正入射（$\theta=0$）时简化为 Eq.14.40：
$$
\sigma_{\max} = \frac{4\pi^3 r^4}{\lambda^2}
$$

**关键实现**（利用 Bessel 函数 + sinc 形式）：
```matlab
x = (4. * pi * r / lambda) * sin(aspect);
val1 = 4. * pi^3 * r^4 / lambda^2;
val2 = 2. * besselj(1,x) / x;   % 2*J1(x)/x = sinc 形式
rcs_po(index) = val1 * (val2 * cos(aspect))^2 + eps;
```

注：`2*J1(x)/x` 是 Airy 函数的 Bessel 等价形式，正好对应圆形孔径的 Fraunhofer 衍射。

---

### 3.4 `rcs_cylinder.m` - 圆/椭圆截面圆柱

**核心公式**：
- **镜面方向**（$\theta=90°$，Eq.14.85）：
$$
\sigma_{spec} = \frac{2\pi h^2 r}{\lambda}
$$
- **非镜面方向**（边缘绕射，Eq.14.84）：
$$
\sigma = \frac{\lambda r \sin\theta}{8\pi \cos^2\theta}
$$
- **椭圆截面**（一般式）：
$$
\sigma = \frac{\lambda r_1^2 r_2^2 \sin\theta}{8\pi \cos^2\theta (r_1^2 \cos^2\phi + r_2^2 \sin^2\phi)^{3/2}}
$$

**代码结构**（switch-case 切换）：
```matlab
switch CylinderType
case 'Circular'
   % 0 到 89.5°   边缘绕射
   for theta = 0.0:.1:90-.5
      rcs(index) = (lambda * r * sin(thetar) / ...
          (8. * pi * (cos(thetar))^2)) + eps;
   end
   % 90°  镜面点
   rcs(index) = (2. * pi * h^2 * r / lambda )+ eps;
   % 90.5 到 180°  边缘绕射
   ...
case 'Elliptic'
   % 椭圆的 (r1^2*cos²phi + r2^2*sin²phi)^1.5 修正
   ...
end
```

---

### 3.5 `rcs_cylinder_cmplx.m` - 圆柱+端盖组合体

**核心思想**：组合体 RCS = 圆柱侧壁 RCS + 圆形端盖 RCS（非相干叠加）

$$
\sigma_{total}(\theta) = \sigma_{cyl}(\theta) + \sigma_{plate}(\theta)
$$

**代码示意**：
```matlab
% 圆柱侧壁（RCS 数组 rcs）
for theta = 0.0:.1:90-.1
   rcs(index) = (lambda * a1 * sin(theta) / ...
      (8 * pi * (cos(theta))^2)) + eps;
end
theta = pi/2;
rcs(index) = (2 * pi * h^2 * a1 / lambda )+ eps;   % 镜面点
...
% 圆形端盖（数组 rcs_po，使用 Eq.14.39）
for aspect_deg = 0.:.1:180
   ...
   rcs_po(index) = val1 * (val2 * cos(aspect))^2 + eps;
end
% 组合
rcs_t =(rcs_po + rcs);
```

**意义**：演示了复杂目标 RCS = 各部分非相干叠加的近似方法（实际应为相干叠加，需考虑相位）。

---

### 3.6 `rcs_rect_plate.m` - 矩形平板（H/V 极化 + PO）

**核心公式**：
- 物理光学近似（Eq.14.53）：
$$
\sigma = \frac{4\pi A^2}{\lambda^2} \cos^2\theta \left[\frac{\sin(k a \sin\theta)}{k a \sin\theta}\right]^2, \quad A = ab
$$
- 精确解（Eq.14.52a~e）：由 5 项级数分别对水平/垂直极化求和。

**关键实现**：
```matlab
sigma1v = cos(ka .*sin(theta)) - i .* sin(ka .*sin(theta)) ./ sin(theta);
sigma2v = exp(i * ka - (pi /4)) / (sqrt(2 * pi) *(ka)^1.5);
sigma3v = (1. + sin(theta)) .* exp(-i * ka .* sin(theta)) ./ (1. - sin(theta)).^2;
sigma4v = (1. - sin(theta)) .* exp(i * ka .* sin(theta)) ./ (1. + sin(theta)).^2;
sigma5v = 1. - (exp(i * 2. * ka - (pi / 2)) / (8. * pi * (ka)^3));
% 垂直极化精确解
rcs_v = (b^2 / pi) .* (abs(sigma1v - sigma2v .*((1. ./ cos(theta)) ...
   + .25 .* sigma2v .* (sigma3v + sigma4v)) .* (sigma5v).^-1)).^2 + eps;
% 物理光学
rcs_po = (4. * pi* a^2 * b^2 / lambda^2 ).*  (cos(theta)).^2 .* ((sin(angle) ./ angle).^2) + eps;
```

---

### 3.7 `rcs_frustum.m` - 截锥 RCS（Eq.14.43）

**核心公式**：
- 镜面方向（法向入射）：
$$
\sigma_{normal} = \frac{8\pi (z_2^{1.5} - z_1^{1.5})^2}{9\lambda} \cdot \frac{\sin\alpha}{\cos^4\alpha}
$$
- 非镜面方向（掠射）：
$$
\sigma = \frac{\lambda z \tan\alpha (\tan(\theta \pm \alpha))^2}{8\pi \sin\theta}
$$

其中 $\alpha = \arctan((r_2-r_1)/h)$ 是半锥角，$z_1 = r_1/\tan\alpha$，$z_2 = r_2/\tan\alpha$。

**关键代码**：
```matlab
alpha = atan(( r2 - r1)/h);
z2 = r2 / tan(alpha);
z1 = r1 / tan(alpha);
delta = (z2^1.5 - z1^1.5)^2;
factor = (8. * pi * delta) / (9. * lambda);
% 大端入射 (indicator=1)
normal_incedence = (180./pi) * ((pi /2) + alpha);
for theta = 0.001:.1:normal_incedence-.5
   rcs(index) = (lambda * z1 * tan(alpha) *(tan(theta - alpha))^2) / ...
      (8. * pi *sin(theta)) + eps;
end
rcs_normal = factor * sin(alpha) / ((cos(alpha))^4) + eps;  % 镜面点
```

---

### 3.8 `rcs_isosceles.m` - 等腰三角板

**核心公式**（Eq.14.65~14.67）：
- $\phi = \pi/2$ 侧视：
$$
\sigma = \frac{4\pi A^2}{\lambda^2} \cos^2\theta \left[\frac{\sin(\beta/2)}{\beta/2}\right]^4
$$
- $\phi = 0$ 正视：
$$
\sigma = \frac{4\pi A^2}{\lambda^2} \cos^2\theta \left[\frac{\sin^4\alpha}{\alpha^4} + \frac{(\sin 2\alpha - 2\alpha)^2}{4\alpha^4}\right]
$$

其中 $A = ab/2$，$\alpha = \frac{2\pi}{\lambda}\cos\phi\sin\theta$，$\beta = \frac{2\pi}{\lambda}\sin\phi\sin\theta$。

---

### 3.9 `rectplate.m` & `polygon.m` - 散射场精确积分

**PO 散射场公式**：
$$
E_s = -\frac{j\omega\mu}{2\pi Z_0}\left(\hat{\theta} \cdot (\hat{\phi} \times \hat{n})\right) \cdot s_{term}
$$

- `rectplate.m` 矩形板的 $s_{term} = l_x l_y \cdot \text{sinc}(k u l_x) \cdot \text{sinc}(k v l_y)$
- `polygon.m` 任意 N 边多边形的 $s_{term} = \sum_{n=1}^{N} \frac{(\hat{n}\times\hat{\alpha}_n)\cdot\hat{\alpha}_{n-1}}{(k\hat{w}\cdot\hat{\alpha}_n)(k\hat{w}\cdot\hat{\alpha}_{n-1})} e^{j k \hat{w}\cdot\vec{r}_n}$

RCS 计算：$\sigma = 20\log_{10}\left(\sqrt{4\pi} |E_s|\right)$

---

### 3.10 `rcs_aspect.m` & `rcs_frequency.m` - 两点散射模型

**核心公式**（点散射体相干叠加）：
$$
\sigma = \left|1 + e^{j 2\pi d}\right|^2
$$

- `rcs_aspect.m`：电距离 $d = (2d_{sp}/\lambda)\cos\theta$ 随方位变化
- `rcs_frequency.m`：电距离 $d = 2d_{sp}/\lambda$ 随频率变化

这两个函数是 RCS 视角依赖和频率依赖的"教学最小模型"，被 `Fig14_3.m`、`Fig14_5_6.m` 调用。

---

### 3.11 GUI 系列

5 个 GUI 文件均由 MATLAB GUIDE 自动生成，主要工作为：
1. 加载 `*_driver.mat` 保存的状态信息
2. 创建 figure、axes、uicontrol
3. 通过 `Callback` 字符串调用核心函数（如 `'[rcsdb] = rcs_circ_plate(r, freq);'`）

`rcs_frustum_driver.m` 是较新版本（基于 `.fig` 二进制），其他是较老版本（基于 MAT 文件）。

---

## 四、代码串联叙述

本章 27 个代码按"由简到繁、由解析到半解析"的思路组织：

1. **基础理论铺垫**（`rcs_aspect.m`/`rcs_frequency.m`）→ 用两个点散射体说明 RCS 视角/频率依赖的根本原因——相干叠加。

2. **球体**（`rcs_sphere.m`、`Fig14_10.m`）→ 最简单的标定目标，给出 RCS 三区（瑞利/谐振/光学）行为。Mie 级数解是其它算法验证的"金标准"，光学区极限 $\sigma = \pi a^2$ 被 `rcs_ellipsoid.m` 在 $a=b=c$ 时自动复用。

3. **椭球**（`rcs_ellipsoid.m`、`Fig14_12a.m`）→ 球体向各向异性目标扩展的桥梁。椭球的曲率半径决定了不同视角下的 RCS。

4. **平板类**（`rcs_circ_plate.m`、`rcs_rect_plate.m`、`rcs_isosceles.m`）→ 平板目标用 PO 法精确求解（散射场积分化为 2D Fourier 变换），可看到矩形板的 `(sin x/x)²` 主瓣形状和 H/V 极化差异。

5. **圆柱类**（`cylinder.m`+`cylinderi.m`、`rcs_cylinder.m`、`rcs_cylinder_cmplx.m`）→ 在 90° 镜面方向有 RCS 峰值（`2πh²r/λ`），其它方向是边缘绕射。`rcs_cylinder_cmplx.m` 进一步把圆柱+端盖组合成复杂体。

6. **截锥**（`rcs_frustum.m`、`rcs_frustum1.m`）→ 模拟导弹/飞机机鼻的旋转对称体，半锥角 $\alpha$ 决定法向入射方向。

7. **通用多边形**（`polygon.m`）→ 三角形、矩形、N 边形都能用同一 PO 算法。

8. **多次反射**（`Fig14_19.m` 等）→ 圆柱内壁多次反射可看作二面/三面角反射器，RCS 显著增强（$\sigma_{max} = 4\pi a^4/\lambda^2$）。

9. **GUI 系列**（`*_gui.m`）→ 把上述函数包装成可视化工具，方便参数扫掠。

从图的角度看：`Fig14_3.m` → `Fig14_5_6.m` → `Fig14_10.m` → `Fig14_12a.m` → `Fig14_19.m` 对应教材的关键图，覆盖了 RCS 各核心知识点。

---

## 五、关键公式汇总

| 公式 | 描述 | 来源 |
|------|------|------|
| $\sigma = 4\pi R^2 |E_s|^2 / |E_i|^2$ | RCS 定义 | Eq.14.1 |
| $\sigma = \pi a^2$ | 球体光学区 | Eq.14.30 |
| $\sigma = \pi a^2 b^2 c^2 / D^2$ | 椭球通用式 | Eq.14.32 |
| $\sigma = (4\pi^3 r^4/\lambda^2)[\cos\theta\cdot 2J_1(x)/x]^2$ | 圆板 PO | Eq.14.39 |
| $\sigma_{max} = 4\pi^3 r^4/\lambda^2$ | 圆板正入射 | Eq.14.40 |
| $\sigma = (8\pi(z_2^{1.5}-z_1^{1.5})^2 / 9\lambda) \cdot \sin\alpha/\cos^4\alpha$ | 截锥镜面 | Eq.14.43 |
| $\sigma = (4\pi A^2/\lambda^2)\cos^2\theta \cdot \text{sinc}^2(ka\sin\theta)$ | 矩形板 PO | Eq.14.53 |
| $\sigma = (4\pi A^2/\lambda^2)\cos^2\theta \cdot [\sin(\beta/2)/(\beta/2)]^4$ | 三角板侧视 | Eq.14.65 |
| $\sigma = \lambda r\sin\theta/(8\pi\cos^2\theta)$ | 圆柱边缘绕射 | Eq.14.84 |
| $\sigma = 2\pi h^2 r/\lambda$ | 圆柱镜面 | Eq.14.85 |
| $\sigma_{dihedral} = 4\pi a^4/\lambda^2$ | 角反射器最大 | Eq.(多次反射) |

---

## 六、章节总结

本章通过 27 个 .m 文件完整覆盖了 RCS 的核心内容：
1. **基础**：`rcs_aspect`/`rcs_frequency` 演示相干叠加
2. **球/椭球**：从解析公式到 Mie 级数，理解三区特性
3. **平板**：PO 法计算矩形/圆形/三角形板，理解 Airy 图样
4. **柱/锥**：镜面 + 边缘绕射，理解不同视角的 RCS 突变
5. **组合体**：多个独立散射中心非相干叠加
6. **GUI**：交互式参数扫掠，便于工程设计

**学习要点**：
- 掌握三区（Reyleigh/Mie/Optical）的判据：$kr = 2\pi a/\lambda$
- 掌握物理光学法（PO）适用范围：$D \gg \lambda$、$D \gg h_{rough}$
- 理解 RCS 视角依赖的根本原因：相干叠加 + 散射中心相对位置
- 工程上要注意组合体是相干叠加（需保留相位）还是非相干叠加（功率相加）
