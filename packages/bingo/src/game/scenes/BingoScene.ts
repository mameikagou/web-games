import { GameObjects, Scene } from "phaser";
import socialData from '../../data/1.json';

// TODO：在点击win后，每次点击，它都会一直弹窗；应该是存在时序问题

/**
 * 表示一个Bingo卡片的单元格
 * @property number - 格子中显示的数字
 * @property isMarked - 是否被标记
 * @property rect - Phaser矩形对象，表示格子的背景
 * @property text - Phaser文本对象，显示数字
 */
interface BingoCell {
    str: string;
    isMarked: boolean;
    rect: GameObjects.Rectangle; // Phaser的矩形图形对象
    text: GameObjects.Text;      // Phaser的文本对象
}

/**
 * Bingo游戏场景
 * 继承自Phaser.Scene，代表一个完整的游戏场景
 */
export default class BingoScene extends Scene {
    private cells: BingoCell[][] = [];
    private readonly GRID_SIZE = socialData.length;
    private readonly CELL_SIZE = 60;
    private readonly CELL_PADDING = 10;
    private isGameWon = false;  // 添加游戏获胜状态标记

    constructor() {
        // 调用父类构造函数，设置场景的唯一标识符
        super({ key: "BingoScene" });
    }

    /**
     * Phaser场景生命周期方法：加载资源
     * 在场景开始前自动调用，用于加载图片、音频等资源
     */
    preload() {
        // 加载资源（图片、音频等）
    }

    /**
     * Phaser场景生命周期方法：创建场景
     * 在preload完成后自动调用，用于创建游戏对象
     */
    create() {
        // 设置场景为自适应大小
        this.scale.on('resize', (gameSize: any) => {
            this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
            if (this.cells.length > 0) {
                this.resetGame();
            }
        });
        
        // 初始化游戏
        this.createBingoCard();
    }

    private createBingoCard() {
        const margin = 40; // 边距
        const padding = 16; // 文本内边距
        
        // 首先计算每个文本的实际尺寸
        const textDimensions: { width: number; height: number; }[][] = [];
        const baseStyle = {
            fontSize: '16px',
            fontFamily: 'Arial',
            wordWrap: { width: 200 }, // 临时宽度用于换行计算
            align: 'center'
        };

        // 第一遍：计算所有文本的尺寸
        for (let row = 0; row < this.GRID_SIZE; row++) {
            textDimensions[row] = [];
            for (let col = 0; col < this.GRID_SIZE; col++) {
                // 创建临时文本来计算尺寸
                const tempText = this.add.text(0, 0, socialData[row][col], baseStyle);
                textDimensions[row][col] = {
                    width: tempText.width + padding * 2,
                    height: tempText.height + padding * 2
                };
                tempText.destroy(); // 删除临时文本
            }
        }

        // 找出最大的单元格尺寸
        let maxCellSize = 0;
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                const size = Math.max(
                    textDimensions[row][col].width,
                    textDimensions[row][col].height
                );
                maxCellSize = Math.max(maxCellSize, size);
            }
        }

        // 计算可用空间
        const availableWidth = this.cameras.main.width - (margin * 2);
        const availableHeight = this.cameras.main.height - (margin * 2);

        // 计算最终的单元格大小（确保适应屏幕）
        const cellSize = Math.min(
            maxCellSize,
            (availableWidth - (this.GRID_SIZE - 1) * this.CELL_PADDING) / this.GRID_SIZE,
            (availableHeight - (this.GRID_SIZE - 1) * this.CELL_PADDING) / this.GRID_SIZE
        );

        // 计算起始位置（居中）
        const totalWidth = (cellSize * this.GRID_SIZE) + (this.CELL_PADDING * (this.GRID_SIZE - 1));
        const totalHeight = totalWidth; // 保持正方形
        const startX = (this.cameras.main.width - totalWidth) / 2;
        const startY = (this.cameras.main.height - totalHeight) / 2;

        // 创建单元格
        this.cells = [];
        let currentY = startY;

        for (let row = 0; row < this.GRID_SIZE; row++) {
            this.cells[row] = [];
            let currentX = startX;

            for (let col = 0; col < this.GRID_SIZE; col++) {
                const cell = this.createCell(
                    currentX + cellSize / 2,
                    currentY + cellSize / 2,
                    socialData[row][col],
                    cellSize,
                    cellSize
                );
                this.cells[row][col] = cell;
                currentX += cellSize + this.CELL_PADDING;
            }
            currentY += cellSize + this.CELL_PADDING;
        }
    }

    private createCell(x: number, y: number, str: string, width: number, height: number): BingoCell {
        const rect = this.add.rectangle(x, y, width, height, 0xffffff);
        rect.setStrokeStyle(2, 0x000000);

        const padding = 16;
        const maxFontSize = 20;
        const minFontSize = 12;
        let fontSize = maxFontSize;

        // 设置文本样式
        const textStyle = {
            fontSize: `${fontSize}px`,
            fontFamily: "Arial",
            color: "#000000",
            align: "center",
            lineSpacing: 6,
            wordWrap: { 
                width: width - padding * 2,
                useAdvancedWrap: true
            }
        };

        // 创建文本
        const text = this.add.text(x, y, str, textStyle);
        text.setOrigin(0.5);

        // 调整字体大小直到文本适合单元格
        while (
            (text.height > height - padding * 2 || text.width > width - padding * 2) && 
            fontSize > minFontSize
        ) {
            fontSize--;
            text.setStyle({ 
                ...textStyle, 
                fontSize: `${fontSize}px` 
            });
        }

        // 确保文本垂直居中
        const textHeight = text.height;
        const availableHeight = height - padding * 2;
        const yOffset = (availableHeight - textHeight) / 2;
        text.setY(y + yOffset);

        // 添加圆角效果
        rect.setData('cornerRadius', 10);
        
        // 悬停效果
        rect.on('pointerover', () => {
            if (!this.isGameWon) {
                rect.setStrokeStyle(2, 0x3498db);
                this.tweens.add({
                    targets: [rect, text],
                    scaleX: 1.02,
                    scaleY: 1.02,
                    duration: 100
                });
            }
        });

        rect.on('pointerout', () => {
            if (!this.isGameWon) {
                rect.setStrokeStyle(2, 0x000000);
                this.tweens.add({
                    targets: [rect, text],
                    scaleX: 1,
                    scaleY: 1,
                    duration: 100
                });
            }
        });

        // 添加悬停效果
        rect.setInteractive();

        // 点击效果
        rect.on("pointerdown", () => {
            if (!this.isGameWon) {
                this.tweens.add({
                    targets: rect,
                    scaleX: 0.95,
                    scaleY: 0.95,
                    duration: 50,
                    yoyo: true
                });
                this.toggleCell(rect, text);
            }
        });

        return {
            str,
            isMarked: false,
            rect,
            text
        };
    }

    private toggleCell(rect: GameObjects.Rectangle, text: GameObjects.Text) {
        const cell = this.findCell(rect);
        if (cell && !this.isGameWon) {
            cell.isMarked = !cell.isMarked;
            
            // 添加标记动画效果
            if (cell.isMarked) {
                rect.setFillStyle(0xffe4e1);  // 使用更柔和的粉色
                this.tweens.add({
                    targets: [rect, text],
                    scale: 1.05,
                    duration: 100,
                    yoyo: true
                });
            } else {
                rect.setFillStyle(0xffffff);
            }
            
            this.time.delayedCall(10, () => {
                if (!this.isGameWon) {
                    this.checkWin();
                }
            });
        }
    }

    private findCell(rect: GameObjects.Rectangle): BingoCell | null {
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                if (this.cells[row][col].rect === rect) {
                    return this.cells[row][col];
                }
            }
        }
        return null;
    }

    private checkWin() {
        if (this.isGameWon) return;  // 保持这个检查

        let hasWon = false;  // 添加一个标志来跟踪是否获胜

        // 这样检查是为了避免时序问题，确保在每次点击前hasWon为false
        // 检查行
        for (let row = 0; row < this.GRID_SIZE; row++) {
            if (this.cells[row].every((cell) => cell.isMarked)) {
                hasWon = true;
                break;
            }
        }

        // 检查列
        if (!hasWon) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                if (this.cells.every((row) => row[col].isMarked)) {
                    hasWon = true;
                    break;
                }
            }
        }

        // 检查对角线
        if (!hasWon && this.cells.every((row, i) => row[i].isMarked)) {
            hasWon = true;
        }

        if (!hasWon && this.cells.every((row, i) => row[this.GRID_SIZE - 1 - i].isMarked)) {
            hasWon = true;
        }

        // 只有在确实获胜且游戏还没有结束时才调用onWin
        if (hasWon && !this.isGameWon) {
            this.onWin();
        }
    }

    private onWin() {
        this.isGameWon = true;  // 立即设置获胜状态
        
        // 创建遮罩层
        const overlay = this.add.rectangle(
            0,
            0,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.7  // alpha透明度值
        );
        // setOrigin: 设置矩形的原点位置（0,0表示左上角）
        overlay.setOrigin(0);
        // setDepth: 设置显示层级，较大的值会显示在上层
        overlay.setDepth(1);

        // 创建弹窗背景
        const popup = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            300,
            200,
            0xffffff
        );
        popup.setDepth(2);

        // BINGO! 文本
        const winText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 50,
            "BINGO!",
            {
                fontSize: "48px",
                color: "#ff0000",
            }
        );
        winText.setOrigin(0.5);
        winText.setDepth(2);

        // 继续按钮
        const continueBtn = this.add.rectangle(
            this.cameras.main.centerX - 70,
            this.cameras.main.centerY + 40,
            100,
            40,
            0x00ff00
        );
        continueBtn.setInteractive();
        continueBtn.setDepth(2);

        const continueText = this.add.text(
            continueBtn.x,
            continueBtn.y,
            "继续",
            {
                fontSize: "24px",
                color: "#ffffff",
            }
        );
        continueText.setOrigin(0.5);
        continueText.setDepth(2);

        // 重置按钮
        const resetBtn = this.add.rectangle(
            this.cameras.main.centerX + 70,
            this.cameras.main.centerY + 40,
            100,
            40,
            0xff0000
        );
        resetBtn.setInteractive();
        resetBtn.setDepth(2);

        const resetText = this.add.text(
            resetBtn.x,
            resetBtn.y,
            "重置",
            {
                fontSize: "24px",
                color: "#ffffff",
            }
        );
        resetText.setOrigin(0.5);
        resetText.setDepth(2);

        // 按钮事件处理
        continueBtn.on("pointerdown", () => {
            this.isGameWon = false;  // 重置获胜状态
            overlay.destroy();
            popup.destroy();
            winText.destroy();
            continueBtn.destroy();
            continueText.destroy();
            resetBtn.destroy();
            resetText.destroy();
        });

        resetBtn.on("pointerdown", () => {
            this.isGameWon = false;  // 重置获胜状态
            this.resetGame();
            overlay.destroy();
            popup.destroy();
            winText.destroy();
            continueBtn.destroy();
            continueText.destroy();
            resetBtn.destroy();
            resetText.destroy();
        });
    }

    /**
     * 重置游戏状态
     * 销毁所有现有游戏对象并重新创建
     */
    private resetGame() {
        this.isGameWon = false;  // 确保重置时也重置获胜状态
        // 遍历并销毁所有游戏对象
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                const cell = this.cells[row][col];
                cell.rect.destroy();  // 销毁Phaser游戏对象
                cell.text.destroy();
            }
        }
        
        this.cells = [];
        this.createBingoCard();
    }

    private shuffle(array: number[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}
