# 藍鷹出擊：micro:bit 像素空戰｜使用說明

## 1. 檔案結構

```
飛行戰鬥遊戲素材包/
├── index.html               ← 遊戲本體（HTML＋CSS＋JavaScript＋音效，全在這一個檔）
├── microbit-controller.ts   ← micro:bit 遙控器程式（MakeCode JavaScript）
├── README.md                ← 本說明
├── google-apps-script/      ← 用 Google 試算表記錄成績
│   ├── Code.gs              ← 貼到 Apps Script 的程式
│   └── 設定說明.md          ← 建立試算表、部署、填網址的步驟
└── assets/                  ← 所有圖片，檔名不可更改
    ├── 直向飛行天空背景.png   玩家藍色戰機.png   玩家藍色子彈.png
    ├── 敵機紅色.png   敵機橘色.png   敵機紫色.png   頭目紅色大型戰機.png
    ├── 敵方無人機.png   地面防空砲.png   敵方橘色子彈.png
    ├── 小型爆炸.png   大型爆炸.png
    ├── 雲朵障礙.png   雪山障礙.png   島嶼跑道機場.png   橋梁.png
    ├── 紅屋頂建築.png   藍屋頂建築.png   藍色機庫.png   雷達塔.png
    ├── 燃料補給.png   護盾道具.png   星星加分道具.png   愛心生命道具.png   降落傘補給箱.png
    └── 精靈素材總表.png     （只用來對照，遊戲不會載入）
```

**放圖片的方法**：把所有 PNG 放進和 `index.html` 同一層的 `assets` 資料夾。程式用 `assets/檔名.png` 載入。如果少了任何一張，遊戲會顯示「圖片載入失敗」並列出缺少的檔名。

## 2. 啟動遊戲

| 方式 | 鍵盤遊玩 | micro:bit 藍牙 |
|---|---|---|
| 直接雙擊 `index.html` | 可以 | 不一定可以（瀏覽器可能封鎖藍牙，建議改用下一種） |
| 本機伺服器 `http://localhost` | 可以 | **可以（建議）** |
| 放到 HTTPS 網站（例如 GitHub Pages） | 可以 | 可以 |

**本機伺服器的開法**（任選一種）：

- **Mac**：打開「終端機」，輸入 `cd ` 加一個空格，把 `飛行戰鬥遊戲素材包` 資料夾拖進終端機視窗，按 Enter。接著輸入 `python3 -m http.server 8000`。
- **Windows**：在 `飛行戰鬥遊戲素材包` 資料夾的網址列輸入 `cmd` 後按 Enter，再輸入 `py -m http.server 8000`。
- **VS Code**：安裝 Live Server 擴充功能，對 `index.html` 按右鍵，選「Open with Live Server」。

然後用 Chrome 開啟 **http://localhost:8000**。

**瀏覽器需求**
- 用鍵盤玩：任何新版瀏覽器都可以（Chrome、Edge、Firefox、Safari）。
- 連 micro:bit：需要**電腦版 Chrome 或 Edge**（Windows、macOS、ChromeOS），網址必須是 `https://` 或 `http://localhost`，電腦藍牙也要開啟。Mac 第一次使用時，要到「系統設定 → 隱私權與安全性 → 藍牙」允許 Chrome。Firefox、Safari 和 iPhone／iPad 都不支援 Web Bluetooth。
- 連不上 micro:bit 時，遊戲仍可完整用鍵盤遊玩。

## 3. 操作方式

| 動作 | 鍵盤 | micro:bit |
|---|---|---|
| 移動 | 方向鍵 或 WASD | 左右／前後傾斜 |
| 射擊 | 空白鍵（按住連發） | A 鍵（按住連發） |
| 特殊攻擊：護盾衝擊波 | Shift | B 鍵 |
| 暫停／繼續 | P | — |
| 全部靜音／取消靜音 | M | — |
| 全螢幕 | F | — |

特殊攻擊效果：清除畫面上所有敵彈、對所有敵人造成傷害、給自己 3 秒護盾，之後要冷卻 12 秒。冷卻狀態會顯示在三個地方：遊戲畫面左下的圓環，以及 micro:bit 的 LED。

**畫面與聲音**
- 遊戲畫面會鋪滿整個瀏覽器視窗，按 F 或上方的「全螢幕」可以把瀏覽器的工具列也隱藏。畫面越寬，可以飛的範圍越大，敵機也會等比例變多。
- 分數、生命、擊落數、波次、最高分、燃料和特殊攻擊冷卻，都直接顯示在遊戲畫面上。
- 排行榜、音量和 micro:bit 設定收在右上角的「排行榜．設定」面板裡。在遊戲中打開這個面板時，遊戲會自動暫停。
- 音效和背景音樂是用瀏覽器內建的 Web Audio 即時合成的 8-bit 聲音，不需要額外的音效檔。上方的「音效」「音樂」按鈕可以個別開關，音量可以在面板裡調整，設定會自動保存。頭目出現時會換成比較緊張的音樂。
- 瀏覽器規定網頁要等使用者先點一下或按一個鍵，才可以發出聲音，所以進入遊戲畫面後要先按「開始遊戲」才會有聲音。

## 4. 連接 micro:bit

1. 到 https://makecode.microbit.org 建立新專案。
2. 點「擴充功能」，搜尋 **bluetooth** 並加入。如果提示要移除 radio，請按同意。
3. 點齒輪 →「專案設定」，勾選 **No Pairing Required: Anyone can connect via Bluetooth.**，然後儲存。
4. 切換到「JavaScript」，把 `microbit-controller.ts` 的全部內容貼上，再按「下載」燒錄到 micro:bit。
5. 燒錄完成後，micro:bit 會顯示 **B**，表示正在等待連線。
6. 用 Chrome 開啟遊戲，按上方的「**連接 micro:bit**」，在跳出的視窗選擇 `BBC micro:bit [xxxxx]`，再按「配對」。
7. 連線成功後，狀態燈會變綠色，micro:bit 顯示 ✔。把 micro:bit 平放，按一下「**校正水平**」。
8. 如果發現前後或左右方向相反，到「排行榜．設定」面板的「micro:bit 操控設定」勾選「方向反轉」。

**micro:bit LED 圖示說明**

| 圖示 | 意思 |
|---|---|
| B | 等待藍牙連線 |
| ✔ | 已連線（還沒開始玩） |
| 飛機 | 遊戲中，特殊攻擊可用 |
| 空心菱形 | 特殊攻擊冷卻中 |
| 哭臉 | 受傷（顯示約 0.6 秒） |
| 睡覺 | 暫停 |
| 骷髏 | 遊戲結束 |

**資料格式**：micro:bit 每 60 毫秒送一行 `x,y,a,b`（例如 `-23,41,1,0`）。遊戲只接受格式正確、數值在 -100～100 之間的資料，錯誤的行會丟掉並計數，數量顯示在「排行榜．設定」面板裡。遊戲只在狀態改變時才傳一個字母給 micro:bit。

**失聯處理**：超過 1.5 秒沒收到資料時，畫面會顯示「訊號中斷」，暫時改用鍵盤。如果藍牙斷線，遊戲會自動暫停，並嘗試重新連線 3 次。

**常見問題**
- 選單裡看不到 micro:bit：確認 micro:bit 有接電、顯示 B，並在專案設定選了 No Pairing Required。也可以按背面的 Reset 再試一次。
- 出現「找不到 UART 服務」：表示燒錄的不是這份程式，或沒有加入 Bluetooth 擴充功能。
- 出現「目前網址無法使用藍牙」：請改用 `http://localhost:8000` 開啟。

## 5. 修改難度、靈敏度、最高紀錄

用記事本或 VS Code 開啟 `index.html`，找到 `const CONFIG = {`（在 `<script>` 開頭附近）：

| 想改的東西 | 設定項目 |
|---|---|
| 三種難度的敵機數量、速度、子彈、初始生命 | `difficulty: { easy / normal / hard }` 裡的 `spawn`、`speed`、`bullet`、`hp` |
| 每一波打多久才出現頭目 | `waveDuration`（秒） |
| 每過一波變難多少 | `waveRamp`（0.15＝15%） |
| 戰機速度、射擊間隔 | `player.speed`、`player.fireInterval` |
| 特殊攻擊冷卻時間 | `special.cooldown` |
| 燃料消耗速度 | `fuel.drainPerSec` |
| 預設音效／音樂音量 | `sound.sfxVolume`、`sound.musicVolume`（0～1） |
| micro:bit 預設靈敏度、死區、方向反轉 | `tilt.sensitivity`、`tilt.deadzone`、`tilt.invertX`、`tilt.invertY` |
| 各種敵機、道具的分數 | `const SCORE = {...}` |

- **操控靈敏度**也可以直接在「排行榜．設定」面板的「micro:bit 操控設定」用滑桿調整，設定會自動保存。靈敏度越高，稍微傾斜就飛得越快；死區越大，手抖越不會讓飛機亂飄。
- **難度**在開始畫面的下拉選單選擇。

**最高紀錄與排行榜**
- 排行榜存在瀏覽器的 localStorage，鍵名是 `pixelSkyAce.records.v1`，最多保留前 10 名。每筆資料有暱稱、分數、擊落數、波次和存檔時間。「最高分」就是排行榜第 1 名的分數。
- **清除紀錄**：打開「排行榜．設定」面板，按「清除排行榜」。
- **手動修改**：按 F12 開啟開發人員工具，到 Application → Local Storage → 本網址，就可以編輯或刪除 `pixelSkyAce.records.v1`。如果資料格式改壞了，遊戲會自動重設，舊資料會備份到 `pixelSkyAce.records.v1.backup`。
- **想讓多個班級的排行榜分開**：把 `CONFIG.storage.records` 改成不同名稱即可。
- 注意：排行榜跟著「瀏覽器＋網址」走。用 `file://` 開和用 `localhost` 開會是兩份不同的排行榜，無痕模式關閉後紀錄也會消失。

## 6. 確認排行榜有記錄

1. 輸入暱稱（例如「測試」），開始遊戲，打下幾架敵機後故意被擊中，直到生命歸零。
2. 結算畫面會顯示分數、擊落數和「你是排行榜第 N 名」，你的成績會用黃色底加 ▶ 標示。
3. 按 F5 重新整理頁面，打開「排行榜．設定」面板，排行榜裡還是有剛才的成績，最高分也有保留，就表示記錄成功。
4. 試試看什麼都不輸入（或只輸入空白）就按開始，應該會看到「請先輸入暱稱」的提示，而不會開始遊戲。

## 7. 用 Google 試算表記錄成績（雲端排行榜）

遊戲結束時，可以自動把玩家暱稱、分數、擊落數、波次、難度、遊戲時長、開始和結束時間、結束原因、操控方式等資料，上傳到 Google 試算表。請依照 `google-apps-script/設定說明.md` 的步驟：

1. 建立試算表，把 `Code.gs` 貼到 Apps Script，執行一次 `setup`。
2. 部署成「網頁應用程式」，執行身分選「我」，存取權選「所有人」。
3. 把網址填進遊戲的「排行榜．設定 → 雲端紀錄」，或填在 `index.html` 的 `CONFIG.cloud.url`。

網路斷線時，成績會先暫存在電腦裡，之後自動補送。原本的本機排行榜（localStorage）也會繼續保留。
