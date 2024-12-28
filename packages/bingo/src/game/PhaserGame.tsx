import { forwardRef, useEffect, useRef } from 'react';
import { Game as PhaserGame_ } from 'phaser';
import BingoScene from './scenes/BingoScene';

interface Props {
    ref: React.RefObject<Phaser.Game>;
}

export default forwardRef<Phaser.Game, Props>(function PhaserGame(props, ref) {
    const gameRef = useRef<Phaser.Game | null>(null);

    useEffect(() => {
        if (!gameRef.current) {
            const config = {
                type: Phaser.AUTO,
                width: 800,
                height: 600,
                scene: [BingoScene],
                parent: 'phaser-container',
                backgroundColor: '#282c34'
            };

            gameRef.current = new PhaserGame_(config);

            if (typeof ref === 'function') {
                ref(gameRef.current);
            } else if (ref) {
                ref.current = gameRef.current;
            }
        }

        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        };
    }, [ref]);

    return <div id="phaser-container"></div>;
});
