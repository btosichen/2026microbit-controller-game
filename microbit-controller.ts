/**
 * 藍鷹出擊 —— micro:bit 無線遙控器（MakeCode JavaScript）
 *
 * 使用前：
 *   1. 到 https://makecode.microbit.org 建立新專案
 *   2. 「擴充功能」搜尋 bluetooth，加入 Bluetooth（會提示移除 radio，請按同意）
 *   3. 齒輪 → 「專案設定」→ 勾選「No Pairing Required: Anyone can connect via Bluetooth.」→ 儲存
 *   4. 上方切到「JavaScript」，把本檔內容全部貼上取代，再按「下載」燒錄到 micro:bit
 *
 * 傳給瀏覽器（每 60 毫秒一行）：  x,y,a,b
 *   x：左右傾斜 -100～100（往右為正）
 *   y：前後傾斜 -100～100
 *   a、b：A／B 鍵是否按著，1＝按著、0＝放開
 *
 * 從瀏覽器收到（狀態改變時才送一個字母）：
 *   C 已連線   G 遊戲中   S 特殊攻擊冷卻中   H 受傷   P 暫停   O 遊戲結束
 */

let connected = false
let mode = "W"        // W＝等待連線
let hurtUntil = 0     // 受傷圖示顯示到什麼時候（毫秒）
let shown = ""        // 目前 LED 上的圖示，避免重複重畫

// 自訂圖示
const ICON_WAIT = images.createImage(`
    . # # . .
    . # . # .
    . # # . .
    . # . # .
    . # # . .
    `)
const ICON_PLANE = images.createImage(`
    . . # . .
    . # # # .
    # # # # #
    . . # . .
    . # # # .
    `)
const ICON_COOL = images.createImage(`
    . . # . .
    . # . # .
    # . . . #
    . # . # .
    . . # . .
    `)

bluetooth.startUartService()

bluetooth.onBluetoothConnected(function () {
    connected = true
    mode = "C"
})

bluetooth.onBluetoothDisconnected(function () {
    connected = false
    mode = "W"
})

// 收到遊戲送來的狀態指令
bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    let line = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine))
    if (line.length == 0) {
        return
    }
    let cmd = line.charAt(0)
    if (cmd == "H") {
        hurtUntil = input.runningTime() + 600
    } else if (cmd == "C" || cmd == "G" || cmd == "S" || cmd == "P" || cmd == "O") {
        mode = cmd
    }
    // 其他看不懂的資料直接忽略
})

// 迴圈一：送出傾斜與按鍵（每秒約 16 次，資料很小，不會塞住藍牙）
basic.forever(function () {
    if (connected) {
        let x = Math.constrain(Math.idiv(input.acceleration(Dimension.X), 10), -100, 100)
        let y = Math.constrain(Math.idiv(input.acceleration(Dimension.Y), 10), -100, 100)
        let a = input.buttonIsPressed(Button.A) ? 1 : 0
        let b = input.buttonIsPressed(Button.B) ? 1 : 0
        bluetooth.uartWriteLine("" + x + "," + y + "," + a + "," + b)
    }
    basic.pause(60)
})

// 迴圈二：依照狀態更新 LED 圖示（只有狀態改變才重畫）
basic.forever(function () {
    let want = mode
    if (!connected) {
        want = "W"
    } else if (input.runningTime() < hurtUntil) {
        want = "H"
    }
    if (want != shown) {
        shown = want
        if (want == "W") {
            ICON_WAIT.showImage(0, 0)          // B：等待藍牙連線
        } else if (want == "C") {
            basic.showIcon(IconNames.Yes, 0)   // 勾勾：已連線
        } else if (want == "G") {
            ICON_PLANE.showImage(0, 0)         // 飛機：遊戲中（特殊攻擊可用）
        } else if (want == "S") {
            ICON_COOL.showImage(0, 0)          // 空心菱形：特殊攻擊冷卻中
        } else if (want == "H") {
            basic.showIcon(IconNames.Sad, 0)   // 哭臉：受傷
        } else if (want == "P") {
            basic.showIcon(IconNames.Asleep, 0) // 睡覺：暫停
        } else if (want == "O") {
            basic.showIcon(IconNames.Skull, 0)  // 骷髏：遊戲結束
        }
    }
    basic.pause(50)
})
