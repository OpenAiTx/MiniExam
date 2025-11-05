# Planning Guide

構建一個前端考試系統，讓使用者可以進行網路基礎知識測驗，支援單選與多選題，系統會自動計分、隨機出題，並保存歷史分數記錄與題目統計。

**Experience Qualities**:
1. **清晰直觀 (Clear)**: 題目呈現清楚，單選/多選區分明確，選項易於閱讀
2. **專業可信 (Professional)**: 呈現學術性質的嚴謹感，適合學習與評估
3. **激勵成就 (Motivating)**: 透過即時反饋、分數展示、錯題統計，鼓勵使用者持續進步

**Complexity Level**: Light Application (multiple features with basic state)
  - 包含考試功能、即時解析、計分系統、歷史記錄、題目統計、錯題復習等多個特性，使用KV storage進行數據持久化

## Essential Features

### 混合題型支援（含填充題）
- **Functionality**: 支援單選題、多選題、填充題混合出題，填充題不區分大小寫，可設定多個正確答案（用逗號分隔）
- **Purpose**: 提供更豐富的測驗形式，更全面評估知識掌握度
- **Trigger**: 從questions.json載入題庫時自動識別題型（type: "single" | "multiple" | "fill_in_the_blanks"）
- **Progression**: 載入題庫 → 識別type屬性 → 根據題型渲染對應UI (RadioGroup、Checkbox或Input)
- **Success criteria**: 三種題型UI清晰區分，填充題答題時不區分大小寫

### 即時答案解析
- **Functionality**: 選擇答案後點擊「查看解析」，立即顯示正確答案與詳細解析
- **Purpose**: 邊答邊學，即時獲得反饋，提升學習效果
- **Trigger**: 點擊「查看解析」按鈕
- **Progression**: 選擇答案 → 點擊查看解析 → 顯示正確/錯誤狀態 → 展示解析內容 → 點擊下一題
- **Success criteria**: 正確答案高亮顯示為綠色，錯誤答案顯示為紅色，解析內容清晰易讀

### 題目統計系統
- **Functionality**: 記錄每道題目的答對/答錯次數，計算正確率
- **Purpose**: 讓使用者了解哪些題目較弱，針對性加強
- **Trigger**: 每次答題後自動更新統計數據
- **Progression**: 答題完成 → 更新該題統計 → 可在統計頁面查看所有題目表現
- **Success criteria**: 統計數據準確，按錯誤次數排序，顯示正確率

### 錯題復習功能
- **Functionality**: 篩選出答錯過的題目進行專項練習
- **Purpose**: 針對性復習弱點，提高學習效率
- **Trigger**: 點擊「錯題復習」按鈕
- **Progression**: 從統計數據篩選錯題 → 組成專項測驗 → 進行答題 → 更新統計
- **Success criteria**: 正確篩選錯題，若無錯題顯示提示，復習模式明確標示

### JSON題庫管理
- **Functionality**: 題目存儲在public/questions.json作為預設題庫，同時支援前端新增、編輯、刪除題目，所有自訂題目會持久化保存在KV storage
- **Purpose**: 降低題庫維護成本，非技術人員也能輕鬆新增題目，且自訂題目不會因為重新整理而遺失
- **Trigger**: 應用啟動時自動載入，優先使用自訂題庫，若無則載入預設題庫
- **Progression**: 載入KV storage → 若無資料則fetch預設JSON → 解析JSON → 存入狀態 → 可用於出題
- **Success criteria**: JSON格式清晰，載入成功，解析無誤，自訂題目持久化保存

### 前端題庫更新功能（支援JSON文字貼上）
- **Functionality**: 提供完整的題庫管理介面，支援新增、編輯、刪除題目，動態調整選項數量，設定正確答案。新增「貼上 JSON」功能，允許直接在網頁輸入框複製貼上 JSON 文字進行批量上傳，無需上傳檔案
- **Purpose**: 讓使用者可以自行擴充題庫，不需要編輯JSON檔案，所有變更即時生效並持久化。JSON文字貼上功能更方便快速導入題目
- **Trigger**: 點擊「題庫管理」進入管理頁面，點擊「貼上 JSON」按鈕開啟文字輸入對話框
- **Progression**: 進入管理頁面 → 查看所有題目 → 點擊新增/編輯 → 填寫表單 → 儲存 → 自動更新KV storage，或點擊「貼上 JSON」→ 貼上JSON文字 → 驗證格式 → 選擇「完全重置」或「差異新增」
- **Success criteria**: 介面直觀易用，表單驗證完整，資料即時保存，支援JSON文字貼上上傳，不影響現有統計數據

### 題庫重設功能
- **Functionality**: 提供重設按鈕，可將題庫還原至預設的questions.json狀態
- **Purpose**: 當自訂題目過多或需要重新開始時，可快速恢復預設題庫
- **Trigger**: 點擊「重設題庫」按鈕並確認
- **Progression**: 點擊重設 → 顯示確認對話框 → 確認後清除KV storage → 重新載入預設題庫
- **Success criteria**: 確認對話框清楚說明影響範圍，重設後題庫恢復預設，不影響答題記錄

### 考試系統
- **Functionality**: 隨機選取題目進行測驗，支援全部題目或錯題模式
- **Purpose**: 提供公平且不重複的測驗體驗
- **Trigger**: 使用者點擊「開始考試」或「錯題復習」
- **Progression**: 顯示歡迎頁面 → 點擊開始 → 隨機抽題 → 逐題作答並查看解析 → 顯示結果
- **Success criteria**: 題目不重複、順序隨機、作答流暢無卡頓

### 自動計分
- **Functionality**: 即時計算答題正確率，顯示得分與答對題數
- **Purpose**: 讓使用者即時了解學習成效
- **Trigger**: 完成所有題目後自動計算
- **Progression**: 收集答案 → 比對正確答案 → 計算分數 → 顯示結果頁面
- **Success criteria**: 分數計算準確，多選題全對才算對

### 分數歷史記錄
- **Functionality**: 保存每次考試的分數、時間與答題詳情
- **Purpose**: 追蹤學習進度，了解進步軌跡
- **Trigger**: 每次考試結束後自動保存
- **Progression**: 完成考試 → 保存至KV storage → 可在歷史頁面查看
- **Success criteria**: 數據持久化成功，可跨session存取

### 動態科目管理
- **Functionality**: 支援動態新增、編輯、刪除科目，每個科目擁有獨立的題庫、答題記錄與統計
- **Purpose**: 讓使用者可以根據需求自訂科目分類，不限於預設科目
- **Trigger**: 在科目選擇頁面點擊「管理科目」按鈕
- **Progression**: 進入科目管理頁面 → 查看所有科目 → 點擊新增/編輯科目 → 填寫科目名稱、描述、圖標 → 儲存 → 自動更新KV storage
- **Success criteria**: 可以新增/編輯/刪除科目，每個科目的題庫、記錄、統計互相獨立，科目資料持久化保存

### 章節管理
- **Functionality**: 題目可以標註所屬章節，方便分類和篩選
- **Purpose**: 讓題目組織更有條理，方便針對特定章節練習
- **Trigger**: 新增/編輯題目時可選填章節欄位
- **Progression**: 編輯題目 → 填寫章節名稱（選填）→ 儲存 → 題目列表顯示章節標籤
- **Success criteria**: 題目可以標註章節，章節資訊在題目列表和答題時顯示

## Edge Case Handling

- **無歷史記錄**: 顯示友善的空狀態提示，鼓勵開始第一次測驗
- **無錯題記錄**: 錯題復習按鈕disabled，顯示「目前沒有錯題可以復習」toast
- **題庫載入失敗**: 顯示錯誤提示，防止開始考試
- **中途離開**: 考試中離開頁面不保存當次結果，需重新開始
- **多選題部分正確**: 只有完全選對才算正確答案
- **填充題大小寫**: 答題時自動轉為小寫比對，不區分大小寫
- **填充題多答案**: 支援多個正確答案（用逗號分隔），答對其中一個即算正確
- **未選擇答案**: 點擊查看解析時顯示toast提示
- **未輸入答案**: 填充題未輸入時顯示toast提示
- **刪除題目**: 顯示確認對話框，警告會影響統計數據
- **刪除科目**: 顯示確認對話框，說明不會影響該科目的題庫和答題記錄
- **表單驗證**: 新增/編輯題目時驗證所有欄位，缺少資料時顯示toast提示
- **填充題選項**: 填充題不需要選項，表單中自動隱藏選項區域
- **最少選項數**: 單選/多選題至少保留兩個選項，刪除時檢查並提示
- **題型切換**: 切換題型時自動清空正確答案選擇，避免狀態不一致
- **JSON格式錯誤**: 貼上JSON文字時驗證格式，格式錯誤顯示toast提示
- **JSON缺少欄位**: 驗證JSON必要欄位（id, question, type, correctAnswer, explanation），缺少時顯示具體錯誤訊息
- **科目ID衝突**: 新增科目時檢查ID是否已存在，存在時提示使用不同名稱

## Design Direction

設計應呈現專業、學術、清晰的氛圍，類似線上教育平台或認證考試系統。介面需簡潔不花俏，強調內容可讀性與資訊階層，讓使用者專注於題目與學習。採用中等豐富度的介面，適當使用卡片、Badge與分隔來組織資訊。

## Color Selection

Triadic (three equally spaced colors) - 使用藍色代表專業學術、綠色代表正確成功、紅色代表錯誤警示，三者形成清晰的資訊指示系統。

- **Primary Color**: 深藍 oklch(0.45 0.15 250) - 代表專業、信賴、學術性，用於主要按鈕與標題
- **Secondary Colors**: 淺灰藍 oklch(0.95 0.01 250) - 用於背景與卡片，保持閱讀舒適度
- **Accent Color**: 活力綠 oklch(0.65 0.20 145) - 用於正確答案、成功提示、鼓勵性元素
- **Foreground/Background Pairings**:
  - Background (淺灰 oklch(0.98 0 0)): 深灰文字 oklch(0.20 0 0) - Ratio 14.8:1 ✓
  - Card (白色 oklch(1 0 0)): 深灰文字 oklch(0.20 0 0) - Ratio 16.5:1 ✓
  - Primary (深藍 oklch(0.45 0.15 250)): 白色文字 oklch(1 0 0) - Ratio 7.2:1 ✓
  - Accent (活力綠 oklch(0.65 0.20 145)): 深灰文字 oklch(0.20 0 0) - Ratio 8.5:1 ✓
  - Destructive (警示紅 oklch(0.55 0.22 25)): 白色文字 oklch(1 0 0) - Ratio 5.8:1 ✓

## Font Selection

使用現代、清晰、易讀的無襯線字體，確保中文與英文混排時的視覺和諧。選擇Noto Sans TC作為中文字體，搭配Inter作為英文與數字字體，兩者均強調清晰度與專業感。

- **Typographic Hierarchy**:
  - H1 (頁面標題): Noto Sans TC Bold / 32px / tracking-tight / leading-tight
  - H2 (區塊標題): Noto Sans TC SemiBold / 24px / tracking-normal / leading-snug
  - H3 (題目編號): Inter Bold / 18px / tracking-wide / leading-normal
  - Body (題目內容): Noto Sans TC Regular / 16px / tracking-normal / leading-relaxed
  - Small (提示文字): Inter Regular / 14px / tracking-normal / leading-normal

## Animations

動畫應精簡且功能性為主，避免干擾答題專注度。主要用於狀態轉換（如題目切換）與成功/失敗反饋，營造流暢的使用體驗並給予適當的心理暗示。

- **Purposeful Meaning**: 使用柔和的淡入淡出表達內容切換，即時反饋使用彈性出現動畫，分數顯示用彈簧效果增加成就感
- **Hierarchy of Movement**: 題目切換使用medium速度（300ms），答案解析出現使用fast速度（200ms），分數統計使用彈簧效果（spring）

## Component Selection

- **Components**: 
  - Card (題目容器、結果卡片、統計卡片、題庫管理卡片、科目管理卡片)
  - Button (開始考試、錯題復習、查看解析、下一題、題庫管理、重設題庫、管理科目、貼上JSON) - 使用primary variant突出主要動作
  - RadioGroup (單選題選項、題型選擇) - 清晰的視覺回饋
  - Checkbox (多選題選項) - 支援多選
  - Input (填充題答案輸入、選項輸入、科目資訊輸入)
  - Textarea (題目輸入、解析輸入、JSON文字輸入)
  - Progress (答題進度條)
  - Badge (單選/多選/填充標籤、分數標籤、答對/答錯標示、正確答案選擇器、章節標籤)
  - ScrollArea (歷史記錄列表、題目統計列表、詳細解析、題目管理列表、科目管理列表)
  - Separator (區隔不同區塊)
  - Toast (sonner) - 即時操作反饋
  - Dialog (上傳JSON對話框、貼上JSON對話框、科目管理對話框)
  - Label (表單標籤)
  
- **Customizations**: 
  - 選項按鈕需自訂樣式，查看解析後正確選項顯示綠色框與背景，錯誤選項顯示紅色框與背景
  - 填充題輸入框在查看解析後根據正確/錯誤顯示綠色或紅色邊框與背景
  - 結果頁面的分數顯示需大字體與彈簧動畫效果
  - 題目統計卡片錯題高亮顯示紅色邊框
  - 題庫管理表單中的正確答案選擇器使用Badge作為可點擊按鈕，選中時高亮顯示
  - 填充題的答案輸入使用獨立的Input區域，並提示不區分大小寫
  - 題目列表中正確答案以綠色文字顯示，方便快速識別
  - 貼上JSON對話框使用大型Textarea，支援font-mono樣式便於閱讀JSON
  
- **States**: 
  - 選項：default (白底黑字) → hover (淺藍背景) → selected (藍框) → correct (綠框綠底) → incorrect (紅框紅底)
  - 填充題輸入框：default (白底黑字) → focus (藍框) → correct (綠框綠底) → incorrect (紅框紅底)
  - 按鈕：disabled state用於防止重複提交、錯題復習無錯題時disabled
  - 解析區：hidden → 點擊後animated appearance
  
- **Icon Selection**: 
  - CheckCircle (正確答案、答對統計)
  - XCircle (錯誤答案、答錯統計)
  - ClockCounterClockwise (歷史記錄)
  - Play (開始考試)
  - ChartLine (分數趨勢、題目統計)
  - Warning (錯題復習)
  - BookOpen (查看解析)
  - Database (題庫管理、管理科目)
  - ArrowCounterClockwise (重設題庫)
  - Plus (新增題目、新增選項、新增科目)
  - Trash (刪除題目、刪除選項、刪除科目)
  - PencilSimple (編輯題目、編輯科目)
  - FloppyDisk (儲存題目、儲存科目)
  - X (取消編輯)
  - DownloadSimple (下載題庫)
  - UploadSimple (上傳檔案)
  - FileArrowDown (完全重置)
  - FileArrowUp (差異新增、貼上JSON)
  
- **Spacing**: 
  - 題目卡片內部：p-6
  - 選項間距：gap-3
  - 區塊間距：gap-6
  - 頁面邊距：px-4 py-8
  
- **Mobile**: 
  - 題目卡片在mobile時減少padding (p-4)
  - 按鈕組在mobile時垂直堆疊 (flex-col)
  - 歷史記錄改為垂直卡片堆疊而非表格
  - 進度條始終保持可見
  - 統計數據在mobile時調整佈局
