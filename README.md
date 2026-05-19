# HW1 GridWorld

> **Mao 7114029004**

使用 Flask 建構的互動式 Grid World 應用程式，實作 **Value Iteration** 演算法，讓使用者可以視覺化觀察每次迭代的價值函數收斂過程與最佳策略。

> 此專案使用 **Google Antigravity** 協助完成。

## 🎮 Live Demo

👉 [點此查看 Live Demo](https://oomao.github.io/Hw1_GridWorld/)

> 💡 **線上 Demo 說明**：此版本將 Value Iteration 演算法完全實作於 JavaScript 中，無需後端即可直接在瀏覽器執行！本地開發版本則保留了完整的 Flask 後端運算 架構。

## ✨ 功能特色

### HW1-1 · 網格地圖
- **可調整的 Grid 大小**：支援 5×5 到 9×9 的方格世界
- **互動式設定**：點擊設定起點（綠色）、終點（紅色）、障礙物（灰色）
- 障礙物上限為 `n − 2`

### HW1-2 · 隨機策略 & 策略評估
- **🎲 Generate Random Policy**：在每個非終點/非障礙的格子上隨機產生一個行動箭頭 (↑↓←→)
- **▶ Run Policy Evaluation**：對該隨機策略執行**迭代策略評估 (Iterative Policy Evaluation)**，依 Bellman expectation equation 求得 V<sup>π</sup>(s)
  - `V(s) ← r(s, π(s)) + γ V(s')`
- 隨機策略矩陣與 V<sup>π</sup>(s) 並排顯示，可直接看到「隨便走」會得到什麼價值

### HW1-3 · 價值迭代 → 最佳策略
- **Value Iteration 演算法**：
  - 使用 Bellman optimality equation：`V*(s) = max_a Σ p(s'|s,a)[r + γV*(s')]`
  - 可調整 Discount (γ)、Step Reward、Goal Reward
- **迭代過程視覺化**：滑桿 + 自動播放，觀察每步 Value Matrix 收斂的過程
- **Optimal Policy π\***：顯示每個狀態的最佳行動方向（取代 HW1-2 的隨機箭頭）
- **Optimal Path**：以視覺化 Grid 畫出 Value Iteration 找到的最佳路徑

## 📁 專案結構

```
HW1/
├── app.py              # Flask 後端（Value Iteration 演算法）
├── templates/
│   └── grid.html       # 前端 HTML 模板
├── static/
│   ├── style.css       # 樣式
│   └── script.js       # 前端互動邏輯
├── AIrecord.md         # AI 對話紀錄
├── requirements.txt    # Python 依賴
└── README.md           # 本文件
```

## 🚀 本地運行

### 環境需求

- Python 3.10+
- pip

### 安裝與啟動

```bash
# 1. Clone 專案
git clone https://github.com/oomao/Hw1_GridWorld.git
cd Hw1_GridWorld

# 2. 安裝依賴
pip install -r requirements.txt

# 3. 啟動伺服器
python app.py
```

開啟瀏覽器前往 `http://127.0.0.1:5000` 即可使用。

## 🧮 演算法說明

### Policy Evaluation (HW1-2)

對於一個給定的（隨機）確定性策略 π：

1. 初始化所有狀態的 V(s) = 0
2. 重複更新直到收斂：
   - `V(s) ← r(s, π(s)) + γ V(s')`
   - 其中 s' 是依策略 π(s) 從 s 走一步抵達的狀態（撞牆/撞障礙物則留在原地）

### Value Iteration (HW1-3)

1. 初始化所有狀態的 V(s) = 0
2. 重複更新直到收斂：
   - `V(s) ← max_a Σ p(s'|s,a)[r + γV(s')]`
3. 收斂後提取最佳策略：
   - `π*(s) = argmax_a Σ p(s'|s,a)[r + γV(s')]`
4. 沿著最佳策略追蹤路徑

### 參數說明

| 參數 | 預設值 | 說明 |
|------|-------|------|
| Discount (γ) | 0.9 | 折扣因子，控制未來獎勵的權重 |
| Step Reward | -0.04 | 每步移動的獎勵（負值表示希望盡快到達） |
| Goal Reward | 1 | 到達終點的獎勵 |

## 📝 開發紀錄

詳細的 AI 輔助開發過程記錄在 [AIrecord.md](./AIrecord.md) 中。

## 📄 授權

本專案僅供學術用途。
