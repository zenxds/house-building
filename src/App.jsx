import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FREE_PROMPTS,
  GRID_COLS,
  GRID_ROWS,
  LEVELS,
  MATERIAL_MAP,
  MATERIALS,
  SKY_THEMES,
} from './gameData.js';
import {
  calculateSimilarity,
  findHint,
  isPassing,
  placeAt,
  removeAt,
} from './gameLogic.js';

const STORAGE_KEY = 'cloud-house-club-v1';

function readSavedGame() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return saved || {};
  } catch {
    return {};
  }
}

function HouseMark() {
  return (
    <span className="house-mark" aria-hidden="true">
      <span className="house-mark__roof" />
      <span className="house-mark__room">
        <span />
      </span>
    </span>
  );
}

function BunnyMascot({ mood = 'happy', small = false }) {
  return (
    <div className={`bunny bunny--${mood}${small ? ' bunny--small' : ''}`} aria-hidden="true">
      <span className="bunny__ear bunny__ear--left" />
      <span className="bunny__ear bunny__ear--right" />
      <span className="bunny__head">
        <span className="bunny__eye bunny__eye--left" />
        <span className="bunny__eye bunny__eye--right" />
        <span className="bunny__nose" />
        <span className="bunny__cheek bunny__cheek--left" />
        <span className="bunny__cheek bunny__cheek--right" />
      </span>
      {!small && <span className="bunny__body" />}
    </div>
  );
}

function Piece({ materialId, sample = false }) {
  const material = MATERIAL_MAP[materialId];
  if (!material) return null;
  const isPerson = material.kind.startsWith('person-');

  return (
    <span
      className={`piece ${sample ? 'piece--sample' : ''} piece--${material.kind}`}
      style={{
        '--piece-color': material.color,
        '--piece-accent': material.accent,
        '--piece-hair': material.hair,
        '--piece-skin': material.skin,
      }}
      aria-hidden="true"
    >
      <span className="piece__shape">
        {material.kind === 'wall' && (
          <>
            <span className="piece__brick piece__brick--one" />
            <span className="piece__brick piece__brick--two" />
          </>
        )}
        {material.kind === 'roof' && <span className="piece__roof-dot" />}
        {material.kind === 'window-square' && <span className="piece__window-cross" />}
        {material.kind === 'window-round' && <span className="piece__window-shine" />}
        {material.kind === 'window-heart' && <span className="piece__window-heart">♥</span>}
        {material.kind === 'door' && (
          <>
            <span className="piece__door-panel" />
            <span className="piece__door-knob" />
          </>
        )}
        {material.kind === 'chimney' && (
          <>
            <span className="piece__smoke piece__smoke--one" />
            <span className="piece__smoke piece__smoke--two" />
          </>
        )}
        {material.kind === 'flower' && (
          <>
            <span className="piece__flower">✿</span>
            <span className="piece__stem" />
          </>
        )}
        {material.kind === 'star' && <span className="piece__star">★</span>}
        {material.kind === 'bush' && (
          <>
            <span className="piece__leaf piece__leaf--one" />
            <span className="piece__leaf piece__leaf--two" />
            <span className="piece__leaf piece__leaf--three" />
            <span className="piece__trunk" />
          </>
        )}
        {material.kind === 'rainbow' && <span className="piece__rainbow-shine" />}
        {material.kind === 'flag' && <span className="piece__flag-star">★</span>}
        {material.kind === 'fence' && (
          <>
            <span className="piece__fence-picket piece__fence-picket--one" />
            <span className="piece__fence-picket piece__fence-picket--two" />
            <span className="piece__fence-picket piece__fence-picket--three" />
          </>
        )}
        {isPerson && (
          <>
            <span className="piece__person-hair" />
            <span className="piece__person-body" />
            <span className="piece__person-head">
              <span className="piece__person-eye piece__person-eye--left" />
              <span className="piece__person-eye piece__person-eye--right" />
              <span className="piece__person-cheek piece__person-cheek--left" />
              <span className="piece__person-cheek piece__person-cheek--right" />
            </span>
            <span className="piece__person-accessory" />
          </>
        )}
      </span>
    </span>
  );
}

function BuildingBoard({
  placements,
  theme = 'morning',
  compact = false,
  interactive = false,
  onCellClick,
  onDropMaterial,
  highlightedCell,
  hideGrid = false,
  label = '搭建房子的格子舞台',
}) {
  const placementMap = useMemo(
    () =>
      new Map(
        placements.map((placement) => [
          `${placement.row}:${placement.col}`,
          placement,
        ]),
      ),
    [placements],
  );

  function handleDrop(event) {
    if (!interactive || !onDropMaterial) return;
    event.preventDefault();
    const materialId = event.dataTransfer.getData('text/material');
    if (!materialId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const col = Math.min(
      GRID_COLS - 1,
      Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * GRID_COLS)),
    );
    const row = Math.min(
      GRID_ROWS - 1,
      Math.max(0, Math.floor(((event.clientY - rect.top) / rect.height) * GRID_ROWS)),
    );
    onDropMaterial(materialId, row, col);
  }

  return (
    <div
      className={`build-board build-board--${theme}${compact ? ' build-board--compact' : ''}${
        hideGrid ? ' build-board--clean' : ''
      }`}
      onDragOver={interactive ? (event) => event.preventDefault() : undefined}
      onDrop={handleDrop}
      aria-label={label}
    >
      <div className="sky-cloud sky-cloud--one" aria-hidden="true" />
      <div className="sky-cloud sky-cloud--two" aria-hidden="true" />
      <div className="sky-spark sky-spark--one" aria-hidden="true">✦</div>
      <div className="sky-spark sky-spark--two" aria-hidden="true">✦</div>
      <div className="board-grid" role={interactive ? 'grid' : undefined}>
        {Array.from({ length: GRID_ROWS * GRID_COLS }, (_, index) => {
          const row = Math.floor(index / GRID_COLS);
          const col = index % GRID_COLS;
          const placement = placementMap.get(`${row}:${col}`);
          const materialName = placement
            ? MATERIAL_MAP[placement.material]?.name
            : '空格';
          const isHighlighted =
            highlightedCell?.row === row && highlightedCell?.col === col;

          if (!interactive) {
            return <span className="board-cell" key={`${row}-${col}`} />;
          }

          return (
            <button
              className={`board-cell board-cell--button${isHighlighted ? ' is-highlighted' : ''}`}
              key={`${row}-${col}`}
              type="button"
              role="gridcell"
              aria-label={`第 ${row + 1} 行，第 ${col + 1} 格，${materialName}`}
              onClick={() => onCellClick?.(row, col)}
            />
          );
        })}
      </div>
      <div className="piece-layer" aria-hidden="true">
        {placements.map((placement) => (
          <span
            className="placed-piece"
            key={placement.id}
            style={{
              '--piece-row': placement.row,
              '--piece-col': placement.col,
              '--grid-cols': GRID_COLS,
              '--grid-rows': GRID_ROWS,
            }}
          >
            <Piece materialId={placement.material} />
          </span>
        ))}
      </div>
      <div className="board-ground" aria-hidden="true">
        <span className="ground-flower ground-flower--one">✿</span>
        <span className="ground-flower ground-flower--two">✿</span>
        <span className="ground-flower ground-flower--three">✿</span>
      </div>
    </div>
  );
}

function BrandButton({ onClick }) {
  return (
    <button className="brand" type="button" onClick={onClick} aria-label="回到游戏首页">
      <HouseMark />
      <span className="brand__words">
        <strong>云朵造屋社</strong>
        <small>Cloud House Club</small>
      </span>
    </button>
  );
}

function HomeScreen({ onStart, soundOn, onToggleSound }) {
  return (
    <main className="home-screen">
      <div className="home-sun" aria-hidden="true" />
      <div className="home-cloud home-cloud--one" aria-hidden="true" />
      <div className="home-cloud home-cloud--two" aria-hidden="true" />
      <header className="home-header">
        <BrandButton />
        <button className="round-icon-button" type="button" onClick={onToggleSound}>
          <span aria-hidden="true">{soundOn ? '♪' : '×'}</span>
          <span className="sr-only">{soundOn ? '关闭声音' : '打开声音'}</span>
        </button>
      </header>

      <section className="home-hero">
        <div className="home-copy">
          <div className="eyebrow"><span>米粒的城堡邀请</span></div>
          <h1>
            小小建筑师，
            <span>今天盖哪一座？</span>
          </h1>
          <p className="home-intro">
            看着目标城堡，把积木放到一样的位置。相似度超过 90%，星星就会亮起来！
          </p>
          <div className="home-actions">
            <button className="primary-button primary-button--big" type="button" onClick={() => onStart('challenge')}>
              <span className="button-spark" aria-hidden="true">✦</span>
              开始第一关
              <span className="button-arrow" aria-hidden="true">→</span>
            </button>
            <button className="paper-button" type="button" onClick={() => onStart('free')}>
              <span aria-hidden="true">✎</span>
              自由创作
            </button>
          </div>
          <div className="home-how">
            <span><b>1</b> 选材料</span>
            <span className="dotted-arrow" aria-hidden="true">···</span>
            <span><b>2</b> 点格子</span>
            <span className="dotted-arrow" aria-hidden="true">···</span>
            <span><b>3</b> 亮星星</span>
          </div>
        </div>

        <div className="home-showcase" aria-label={`${LEVELS[0].name}示例`}>
          <div className="pin pin--left" aria-hidden="true" />
          <div className="pin pin--right" aria-hidden="true" />
          <div className="showcase-label">今日目标</div>
          <BuildingBoard
            placements={LEVELS[0].target}
            compact
            hideGrid
            label={`${LEVELS[0].name}预览`}
          />
          <div className="showcase-caption">
            <span>{LEVELS[0].name}</span>
            <span className="showcase-stars" aria-label="三颗星">★ ★ ★</span>
          </div>
          <div className="mascot-note">
            <BunnyMascot />
            <span>“窗户要能看见彩虹哦！”</span>
          </div>
        </div>
      </section>
      <div className="home-hills" aria-hidden="true">
        <span className="hill hill--one" />
        <span className="hill hill--two" />
      </div>
    </main>
  );
}

function MaterialShelf({ palette, selectedMaterial, tool, onSelect, onDragStart }) {
  return (
    <div className="material-shelf" role="group" aria-label="建筑材料">
      {palette.map((materialId) => {
        const material = MATERIAL_MAP[materialId];
        return (
          <button
            className={`material-card${
              selectedMaterial === materialId && tool === 'build' ? ' is-selected' : ''
            }`}
            type="button"
            key={materialId}
            aria-pressed={selectedMaterial === materialId && tool === 'build'}
            draggable
            onDragStart={(event) => onDragStart(event, materialId)}
            onClick={() => onSelect(materialId)}
          >
            <span className="material-card__sample"><Piece materialId={materialId} sample /></span>
            <span className="material-card__name">{material.name}</span>
            <span className="material-card__category">{material.category}</span>
          </button>
        );
      })}
    </div>
  );
}

function ScoreMeter({ score }) {
  return (
    <div className="score-meter" aria-label={`当前相似度 ${score}%`}>
      <div className="score-meter__top">
        <span>相似度</span>
        <strong>{score}<small>%</small></strong>
      </div>
      <div className="score-meter__track">
        <span className="score-meter__fill" style={{ width: `${score}%` }} />
        <span className="score-meter__goal" style={{ left: '90%' }} />
      </div>
      <p>{score > 90 ? '闪闪发光，可以验收啦！' : '超过 90%，就能点亮星星'}</p>
    </div>
  );
}

function ObjectivePanel({
  mode,
  level,
  levelIndex,
  unlockedLevel,
  onChooseLevel,
  skyTheme,
  onThemeChange,
  freePrompt,
}) {
  if (mode === 'free') {
    return (
      <aside className="objective-panel objective-panel--free">
        <div className="panel-kicker"><span>自由创作间</span><i aria-hidden="true">✎</i></div>
        <h2>这次，由你来当设计师</h2>
        <p>没有标准答案，想盖多奇妙都可以。</p>
        <div className="prompt-card">
          <span className="prompt-card__tape" aria-hidden="true" />
          <small>灵感悄悄话</small>
          <strong>{freePrompt}</strong>
        </div>
        <div className="theme-picker">
          <h3>选一片天空</h3>
          <div className="theme-options">
            {SKY_THEMES.map((theme) => (
              <button
                type="button"
                key={theme.id}
                className={skyTheme === theme.id ? 'is-selected' : ''}
                onClick={() => onThemeChange(theme.id)}
                style={{ '--swatch': theme.color }}
                aria-pressed={skyTheme === theme.id}
              >
                <i aria-hidden="true">{theme.icon}</i>
                <span>{theme.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="free-cheer">
          <BunnyMascot small />
          <span>大胆试一试，每座怪房子都可能是新发明！</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="objective-panel">
      <div className="level-path" aria-label="关卡选择">
        {LEVELS.map((item, index) => {
          const locked = index + 1 > unlockedLevel;
          return (
            <button
              type="button"
              key={item.id}
              className={`${index === levelIndex ? 'is-current' : ''}${locked ? ' is-locked' : ''}`}
              disabled={locked}
              onClick={() => onChooseLevel(index)}
              aria-label={locked ? `第 ${index + 1} 关还未解锁` : `进入第 ${index + 1} 关`}
            >
              {locked ? <span className="tiny-lock" aria-hidden="true" /> : index + 1}
            </button>
          );
        })}
      </div>
      <div className="panel-kicker"><span>第 {level.number} 关</span><i aria-hidden="true">目标卡</i></div>
      <h2>{level.name}</h2>
      <p>{level.story}</p>
      <div className="target-card">
        <span className="target-card__tape target-card__tape--left" aria-hidden="true" />
        <span className="target-card__tape target-card__tape--right" aria-hidden="true" />
        <BuildingBoard
          placements={level.target}
          theme={level.skyTheme}
          compact
          label={`${level.name}目标图`}
        />
        <div className="target-card__footer">
          <span>照着它来盖</span>
          <span aria-hidden="true">↗</span>
        </div>
      </div>
      <div className="tip-bubble">
        <BunnyMascot small />
        <span><b>米粒提示：</b>{level.tip}</span>
      </div>
    </aside>
  );
}

function TopBar({ mode, onModeChange, onHome, soundOn, onToggleSound, onHelp }) {
  return (
    <header className="topbar">
      <BrandButton onClick={onHome} />
      <nav className="mode-switch" aria-label="游戏模式">
        <button
          type="button"
          className={mode === 'challenge' ? 'is-active' : ''}
          onClick={() => onModeChange('challenge')}
        >
          <span aria-hidden="true">★</span> 闯关模式
        </button>
        <button
          type="button"
          className={mode === 'free' ? 'is-active' : ''}
          onClick={() => onModeChange('free')}
        >
          <span aria-hidden="true">✎</span> 自由创作
        </button>
      </nav>
      <div className="topbar__actions">
        <button className="round-icon-button" type="button" onClick={onHelp} aria-label="打开玩法说明">?</button>
        <button className="round-icon-button" type="button" onClick={onToggleSound} aria-label={soundOn ? '关闭声音' : '打开声音'}>
          <span aria-hidden="true">{soundOn ? '♪' : '×'}</span>
        </button>
      </div>
    </header>
  );
}

function Celebration({ result, level, onClose, onNext, isLastLevel }) {
  const passed = result.type === 'success';
  return (
    <div className="modal-backdrop" role="presentation">
      <section className={`result-modal result-modal--${passed ? 'success' : 'retry'}`} role="dialog" aria-modal="true" aria-labelledby="result-title">
        {passed && (
          <div className="confetti" aria-hidden="true">
            {Array.from({ length: 18 }, (_, index) => <i key={index} style={{ '--i': index }} />)}
          </div>
        )}
        <div className="result-modal__badge" aria-hidden="true">
          {passed ? <span>★</span> : <BunnyMascot mood="thinking" small />}
        </div>
        <p className="result-modal__kicker">{passed ? '城堡验收成功' : '就差一点点'}</p>
        <h2 id="result-title">{passed ? '哇，星星亮起来啦！' : '再看看目标城堡吧'}</h2>
        <div className="result-score">
          <strong>{result.score}</strong><span>%</span>
        </div>
        <p>
          {passed
            ? `你获得了“${level.badge}”，新材料已经准备好了。`
            : result.score >= 70
              ? '已经很像啦！找找颜色或位置不一样的小积木。'
              : '先搭好墙壁和屋顶，再来放门窗，会更容易。'}
        </p>
        <div className="result-modal__actions">
          {passed ? (
            <button className="primary-button" type="button" onClick={onNext}>
              {isLastLevel ? '去自由创作' : '去下一关'} <span aria-hidden="true">→</span>
            </button>
          ) : (
            <button className="primary-button" type="button" onClick={onClose}>继续搭建</button>
          )}
          {passed && <button className="text-button" type="button" onClick={onClose}>再看看我的城堡</button>}
        </div>
      </section>
    </div>
  );
}

function HelpModal({ onClose }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="关闭玩法说明">×</button>
        <div className="help-modal__heading">
          <BunnyMascot small />
          <div><small>米粒教你</small><h2 id="help-title">三步盖好小城堡</h2></div>
        </div>
        <ol className="help-steps">
          <li><b>1</b><span><strong>选一块材料</strong>点一下下方的积木。</span></li>
          <li><b>2</b><span><strong>放进格子里</strong>再点一下想放的位置，也可以直接拖过去。</span></li>
          <li><b>3</b><span><strong>检查城堡</strong>相似度超过 90% 就过关。</span></li>
        </ol>
        <button className="primary-button" type="button" onClick={onClose}>我会啦</button>
      </section>
    </div>
  );
}

function AlbumModal({ creations, onClose, onLoad }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="album-modal" role="dialog" aria-modal="true" aria-labelledby="album-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="关闭作品册">×</button>
        <div className="album-modal__heading">
          <span aria-hidden="true">✦</span>
          <div><small>云朵作品册</small><h2 id="album-title">我盖过的小房子</h2></div>
        </div>
        {creations.length ? (
          <div className="album-grid">
            {creations.map((creation, index) => (
              <article className="album-card" key={creation.id}>
                <BuildingBoard placements={creation.placements} theme={creation.theme} compact hideGrid label={creation.name} />
                <div><strong>{creation.name}</strong><small>作品 {creations.length - index}</small></div>
                <button type="button" onClick={() => onLoad(creation)}>继续搭</button>
              </article>
            ))}
          </div>
        ) : (
          <div className="album-empty">
            <HouseMark />
            <strong>作品册还空空的</strong>
            <span>在自由创作里盖一座房子，再点“保存作品”。</span>
          </div>
        )}
      </section>
    </div>
  );
}

function App() {
  const savedGame = useMemo(readSavedGame, []);
  const [screen, setScreen] = useState('home');
  const [mode, setMode] = useState('challenge');
  const [levelIndex, setLevelIndex] = useState(0);
  const [challengeBuilds, setChallengeBuilds] = useState(savedGame.challengeBuilds || {});
  const [freeBuild, setFreeBuild] = useState(savedGame.freeBuild || []);
  const [unlockedLevel, setUnlockedLevel] = useState(savedGame.unlockedLevel || 1);
  const [badges, setBadges] = useState(savedGame.badges || []);
  const [creations, setCreations] = useState(savedGame.creations || []);
  const [skyTheme, setSkyTheme] = useState(savedGame.skyTheme || 'morning');
  const [soundOn, setSoundOn] = useState(savedGame.soundOn ?? true);
  const [selectedMaterial, setSelectedMaterial] = useState('pink-wall');
  const [tool, setTool] = useState('build');
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState('');
  const [highlightedCell, setHighlightedCell] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showAlbum, setShowAlbum] = useState(false);
  const audioContextRef = useRef(null);
  const toastTimerRef = useRef(null);
  const highlightTimerRef = useRef(null);

  const level = LEVELS[levelIndex];
  const build = mode === 'challenge' ? challengeBuilds[level.id] || [] : freeBuild;
  const palette = mode === 'challenge' ? level.palette : MATERIALS.map((material) => material.id);
  const score = mode === 'challenge' ? calculateSimilarity(level.target, build) : 0;
  const freePrompt = FREE_PROMPTS[(freeBuild.length + creations.length) % FREE_PROMPTS.length];

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        challengeBuilds,
        freeBuild,
        unlockedLevel,
        badges,
        creations,
        skyTheme,
        soundOn,
      }),
    );
  }, [challengeBuilds, freeBuild, unlockedLevel, badges, creations, skyTheme, soundOn]);

  useEffect(() => {
    const firstMaterial = mode === 'challenge' ? level.palette[0] : MATERIALS[0].id;
    setSelectedMaterial(firstMaterial);
    setTool('build');
    setHistory([]);
    setHighlightedCell(null);
  }, [mode, level]);

  useEffect(
    () => () => {
      window.clearTimeout(toastTimerRef.current);
      window.clearTimeout(highlightTimerRef.current);
    },
    [],
  );

  function playSound(kind = 'tap') {
    if (!soundOn) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioContextRef.current) audioContextRef.current = new AudioContext();
      const context = audioContextRef.current;
      const notes = kind === 'success' ? [523, 659, 784, 1047] : kind === 'hint' ? [659, 880] : [440];
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, context.currentTime + index * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + index * 0.1 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * 0.1 + 0.12);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(context.currentTime + index * 0.1);
        oscillator.stop(context.currentTime + index * 0.1 + 0.14);
      });
    } catch {
      // The game remains fully usable if a browser blocks audio.
    }
  }

  function showToast(message) {
    setToast(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 2300);
  }

  function writeBuild(nextBuild) {
    if (mode === 'challenge') {
      setChallengeBuilds((current) => ({ ...current, [level.id]: nextBuild }));
    } else {
      setFreeBuild(nextBuild);
    }
  }

  function commitBuild(nextBuild) {
    setHistory((current) => [...current.slice(-19), build]);
    writeBuild(nextBuild);
    setResult(null);
  }

  function handleCellClick(row, col) {
    if (tool === 'erase') {
      const next = removeAt(build, row, col);
      if (next.length === build.length) return;
      commitBuild(next);
      playSound('tap');
      return;
    }

    if (!selectedMaterial) return;
    commitBuild(placeAt(build, selectedMaterial, row, col));
    playSound('tap');
  }

  function handleDropMaterial(materialId, row, col) {
    setSelectedMaterial(materialId);
    setTool('build');
    commitBuild(placeAt(build, materialId, row, col));
    playSound('tap');
  }

  function selectMaterial(materialId) {
    setSelectedMaterial(materialId);
    setTool('build');
    playSound('tap');
  }

  function undo() {
    if (!history.length) {
      showToast('还没有可以撤销的积木');
      return;
    }
    const previous = history[history.length - 1];
    setHistory((current) => current.slice(0, -1));
    writeBuild(previous);
    playSound('tap');
  }

  function clearBoard() {
    if (!build.length) {
      showToast('舞台已经空空的啦');
      return;
    }
    commitBuild([]);
    showToast('积木回到材料盒了');
    playSound('tap');
  }

  function useHint() {
    const hint = findHint(level.target, build);
    if (!hint) {
      if (isPassing(calculateSimilarity(level.target, build))) {
        showToast('每一块都放好啦，快去检查！');
      } else {
        setTool('erase');
        showToast('还有多余的积木，米粒帮你拿好了橡皮擦');
      }
      return;
    }
    setTool('build');
    setSelectedMaterial(hint.material);
    commitBuild(placeAt(build, hint.material, hint.row, hint.col));
    setHighlightedCell({ row: hint.row, col: hint.col });
    window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => setHighlightedCell(null), 1500);
    showToast(`米粒帮你放了一块${MATERIAL_MAP[hint.material].name}`);
    playSound('hint');
  }

  function checkHouse() {
    const currentScore = calculateSimilarity(level.target, build);
    if (isPassing(currentScore)) {
      setUnlockedLevel((current) => Math.max(current, Math.min(LEVELS.length, levelIndex + 2)));
      setBadges((current) => (current.includes(level.badge) ? current : [...current, level.badge]));
      setResult({ type: 'success', score: currentScore });
      playSound('success');
    } else {
      setResult({ type: 'retry', score: currentScore });
      playSound('hint');
    }
  }

  function chooseLevel(index) {
    if (index + 1 > unlockedLevel) return;
    setLevelIndex(index);
    setResult(null);
    playSound('tap');
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setResult(null);
    setScreen('game');
    playSound('tap');
  }

  function goNext() {
    setResult(null);
    if (levelIndex === LEVELS.length - 1) {
      switchMode('free');
    } else {
      setLevelIndex((current) => current + 1);
    }
  }

  function saveCreation() {
    if (!freeBuild.length) {
      showToast('先放几块积木，再保存作品吧');
      return;
    }
    const creation = {
      id: Date.now(),
      name: `我的云朵小屋`,
      theme: skyTheme,
      placements: freeBuild,
    };
    setCreations((current) => [creation, ...current].slice(0, 6));
    showToast('作品已经收进云朵作品册');
    playSound('success');
  }

  function loadCreation(creation) {
    setFreeBuild(creation.placements);
    setSkyTheme(creation.theme);
    setShowAlbum(false);
    setMode('free');
    setScreen('game');
    setHistory([]);
    showToast('作品已经放回舞台');
  }

  if (screen === 'home') {
    return (
      <HomeScreen
        soundOn={soundOn}
        onToggleSound={() => setSoundOn((current) => !current)}
        onStart={(nextMode) => {
          setMode(nextMode);
          setScreen('game');
          playSound('tap');
        }}
      />
    );
  }

  return (
    <div className={`app app--${mode}`}>
      <TopBar
        mode={mode}
        onModeChange={switchMode}
        onHome={() => setScreen('home')}
        soundOn={soundOn}
        onToggleSound={() => setSoundOn((current) => !current)}
        onHelp={() => setShowHelp(true)}
      />

      <main className="game-layout">
        <ObjectivePanel
          mode={mode}
          level={level}
          levelIndex={levelIndex}
          unlockedLevel={unlockedLevel}
          onChooseLevel={chooseLevel}
          skyTheme={skyTheme}
          onThemeChange={(theme) => {
            setSkyTheme(theme);
            playSound('tap');
          }}
          freePrompt={freePrompt}
        />

        <section className="workshop">
          <div className="workshop__heading">
            <div>
              <span className="workshop__kicker">{mode === 'challenge' ? `正在搭建 · 第 ${level.number} 关` : '我的想象力工地'}</span>
              <h1>{mode === 'challenge' ? level.name : '我的云朵小屋'}</h1>
            </div>
            {mode === 'challenge' ? (
              <ScoreMeter score={score} />
            ) : (
              <button className="album-button" type="button" onClick={() => setShowAlbum(true)}>
                <span aria-hidden="true">▣</span> 作品册 <b>{creations.length}</b>
              </button>
            )}
          </div>

          <div className="stage-wrap">
            <div className="stage-ribbon"><span aria-hidden="true">✦</span>{mode === 'challenge' ? '把积木放进对应的格子' : '每一个格子都听你的'}</div>
            <BuildingBoard
              placements={build}
              theme={mode === 'free' ? skyTheme : level.skyTheme}
              interactive
              onCellClick={handleCellClick}
              onDropMaterial={handleDropMaterial}
              highlightedCell={highlightedCell}
            />
          </div>

          <div className="tool-row" aria-label="搭建工具">
            <button type="button" onClick={undo} disabled={!history.length}><span aria-hidden="true">↶</span> 撤销</button>
            <button
              type="button"
              className={tool === 'erase' ? 'is-active' : ''}
              onClick={() => {
                setTool((current) => (current === 'erase' ? 'build' : 'erase'));
                playSound('tap');
              }}
              aria-pressed={tool === 'erase'}
            >
              <span className="eraser-icon" aria-hidden="true" /> 橡皮擦
            </button>
            <button type="button" onClick={clearBoard}><span aria-hidden="true">⌂</span> 清空</button>
            {mode === 'challenge' && <button className="hint-button" type="button" onClick={useHint}><span aria-hidden="true">✦</span> 帮我一块</button>}
            {mode === 'free' && <button className="hint-button" type="button" onClick={saveCreation}><span aria-hidden="true">♡</span> 保存作品</button>}
          </div>

          <div className="shelf-heading">
            <div><span>材料盒</span><small>{tool === 'erase' ? '橡皮擦已拿好，点积木就能擦掉' : '先选材料，再点格子；也可以拖过去'}</small></div>
            {mode === 'challenge' && (
              <button className="check-button" type="button" onClick={checkHouse}>
                检查城堡 <span aria-hidden="true">★</span>
              </button>
            )}
          </div>
          <MaterialShelf
            palette={palette}
            selectedMaterial={selectedMaterial}
            tool={tool}
            onSelect={selectMaterial}
            onDragStart={(event, materialId) => {
              event.dataTransfer.setData('text/material', materialId);
              event.dataTransfer.effectAllowed = 'copy';
            }}
          />
        </section>
      </main>

      {toast && <div className="toast" role="status"><span aria-hidden="true">✦</span>{toast}</div>}
      {result && (
        <Celebration
          result={result}
          level={level}
          isLastLevel={levelIndex === LEVELS.length - 1}
          onClose={() => setResult(null)}
          onNext={goNext}
        />
      )}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showAlbum && <AlbumModal creations={creations} onClose={() => setShowAlbum(false)} onLoad={loadCreation} />}
    </div>
  );
}

export default App;
