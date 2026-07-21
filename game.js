(() => {
  const canvas = document.querySelector('#game-canvas');
  if (!canvas) return;

  const context = canvas.getContext('2d');
  const scoreElement = document.querySelector('#score');
  const highScoreElement = document.querySelector('#high-score');
  const overlay = document.querySelector('#game-overlay');
  const overlayTitle = document.querySelector('#overlay-title');
  const overlayCopy = document.querySelector('#overlay-copy');
  const startButton = document.querySelector('#start-game');
  const pauseButton = document.querySelector('#pause-game');
  const restartButton = document.querySelector('#restart-game');
  const gridSize = 20;
  const cellSize = canvas.width / gridSize;
  const tickRate = 120;
  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };

  let snake;
  let food;
  let enemy;
  let direction;
  let queuedDirection;
  let score = 0;
  let highScore = Number(localStorage.getItem('worm-run-high-score') || 0);
  let timerId = null;
  let isRunning = false;
  let isPaused = false;
  let enemyStep = 0;

  highScoreElement.textContent = String(highScore);

  function resetState() {
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    direction = 'right';
    queuedDirection = 'right';
    score = 0;
    enemyStep = 0;
    food = findFreeCell();
    enemy = findFreeCell();
    scoreElement.textContent = '0';
    draw();
  }

  function findFreeCell() {
    const occupied = new Set((snake || []).map((part) => `${part.x},${part.y}`));
    if (food) occupied.add(`${food.x},${food.y}`);
    if (enemy) occupied.add(`${enemy.x},${enemy.y}`);
    const freeCells = [];
    for (let y = 0; y < gridSize; y += 1) {
      for (let x = 0; x < gridSize; x += 1) {
        if (!occupied.has(`${x},${y}`)) freeCells.push({ x, y });
      }
    }
    return freeCells[Math.floor(Math.random() * freeCells.length)] || { x: 1, y: 1 };
  }

  function setDirection(nextDirection) {
    if (!directions[nextDirection] || opposites[direction] === nextDirection) return;
    queuedDirection = nextDirection;
  }

  function startGame() {
    if (isRunning && !isPaused) return;
    if (!isRunning) resetState();
    isRunning = true;
    isPaused = false;
    pauseButton.disabled = false;
    pauseButton.textContent = '일시정지';
    overlay.classList.add('is-hidden');
    clearInterval(timerId);
    timerId = setInterval(tick, tickRate);
  }

  function pauseGame() {
    if (!isRunning) return;
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? '계속하기' : '일시정지';
    overlayTitle.textContent = isPaused ? '일시정지' : '';
    overlayCopy.textContent = isPaused ? '계속하기 버튼을 눌러 게임을 이어가세요.' : '';
    overlay.classList.toggle('is-hidden', !isPaused);
  }

  function endGame() {
    isRunning = false;
    isPaused = false;
    clearInterval(timerId);
    timerId = null;
    pauseButton.disabled = true;
    overlayTitle.textContent = '게임 오버';
    overlayCopy.textContent = `점수 ${score} · 다시 시작해 보세요.`;
    overlay.classList.remove('is-hidden');
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('worm-run-high-score', String(highScore));
      highScoreElement.textContent = String(highScore);
    }
  }

  function restartGame() {
    clearInterval(timerId);
    timerId = null;
    isRunning = false;
    isPaused = false;
    pauseButton.disabled = true;
    overlayTitle.textContent = '준비됐나요?';
    overlayCopy.textContent = '시작 버튼을 눌러 게임을 시작하세요.';
    overlay.classList.remove('is-hidden');
    resetState();
  }

  function moveEnemy() {
    const candidates = [{ x: enemy.x + 1, y: enemy.y }, { x: enemy.x - 1, y: enemy.y }, { x: enemy.x, y: enemy.y + 1 }, { x: enemy.x, y: enemy.y - 1 }]
      .filter((cell) => cell.x >= 0 && cell.x < gridSize && cell.y >= 0 && cell.y < gridSize)
      .filter((cell) => !snake.some((part) => part.x === cell.x && part.y === cell.y));
    if (candidates.length > 0) enemy = candidates[Math.floor(Math.random() * candidates.length)];
  }

  function tick() {
    if (!isRunning || isPaused) return;
    direction = queuedDirection;
    const head = snake[0];
    const nextHead = { x: head.x + directions[direction].x, y: head.y + directions[direction].y };
    const hitsWall = nextHead.x < 0 || nextHead.x >= gridSize || nextHead.y < 0 || nextHead.y >= gridSize;
    const hitsSelf = snake.some((part) => part.x === nextHead.x && part.y === nextHead.y);
    const hitsEnemy = enemy.x === nextHead.x && enemy.y === nextHead.y;
    if (hitsWall || hitsSelf || hitsEnemy) { endGame(); return; }
    snake.unshift(nextHead);
    const ateFood = nextHead.x === food.x && nextHead.y === food.y;
    if (ateFood) {
      score += 10;
      scoreElement.textContent = String(score);
      food = findFreeCell();
    } else {
      snake.pop();
    }
    enemyStep += 1;
    if (enemyStep % 2 === 0) moveEnemy();
    draw();
  }

  function drawCell(cell, color, inset = 2) {
    context.fillStyle = color;
    context.fillRect(cell.x * cellSize + inset, cell.y * cellSize + inset, cellSize - inset * 2, cellSize - inset * 2);
  }

  function draw() {
    context.fillStyle = '#0a1010';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'rgba(154, 229, 201, .07)';
    context.lineWidth = 1;
    for (let index = 1; index < gridSize; index += 1) {
      context.beginPath(); context.moveTo(index * cellSize, 0); context.lineTo(index * cellSize, canvas.height); context.stroke();
      context.beginPath(); context.moveTo(0, index * cellSize); context.lineTo(canvas.width, index * cellSize); context.stroke();
    }
    drawCell(food, '#f2ca98', 3);
    drawCell(enemy, '#ff9e9e', 3);
    snake.forEach((part, index) => drawCell(part, index === 0 ? '#d8ffed' : '#79c9ad', 2));
  }

  document.addEventListener('keydown', (event) => {
    const keyMap = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
    const nextDirection = keyMap[event.key];
    if (nextDirection) { event.preventDefault(); setDirection(nextDirection); }
    if (event.key === ' ') { event.preventDefault(); pauseGame(); }
  });

  document.querySelectorAll('[data-direction]').forEach((button) => {
    button.addEventListener('click', () => setDirection(button.dataset.direction));
  });
  startButton.addEventListener('click', startGame);
  pauseButton.addEventListener('click', pauseGame);
  restartButton.addEventListener('click', restartGame);
  resetState();
})();
