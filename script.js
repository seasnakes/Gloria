const state = {
  gold: 20,
  wins: 0,
  bagSize: 4,
  cells: [],
  inventory: [],
  selectedShopItem: null,
};

const itemPool = [
  { id: 'sticker', name: '贴纸夹', cost: 3, size: 1, basePower: 2, buff: { type: 'self', value: 1 }, color: '#f08dc5', desc: '自带 +1 战力（可叠加）' },
  { id: 'plush', name: '小熊挂件', cost: 5, size: 1, basePower: 4, buff: { type: 'adjacent', value: 1 }, color: '#8bcfd5', desc: '给上下左右物品 +1 战力' },
  { id: 'card', name: '角色拍立得', cost: 4, size: 1, basePower: 3, buff: { type: 'row', value: 1 }, color: '#a79af0', desc: '给同一行物品 +1 战力' },
  { id: 'ribbon', name: '缎带徽章', cost: 6, size: 1, basePower: 5, buff: { type: 'none', value: 0 }, color: '#f9b778', desc: '纯高白值单卡' },
];

const bagUpgrades = [
  { id: 'bag-up-1', name: '痛包扩展 +1 列', cost: 8, type: 'col', value: 1, desc: '最大 6x6，扩展摆盘空间' },
  { id: 'bag-up-2', name: '痛墙扩展 +1 行', cost: 8, type: 'row', value: 1, desc: '最大 6x6，适合后期联动' },
];

function init() {
  state.cells = Array(state.bagSize * state.bagSize).fill(null);
  bindTabEvents();
  renderShop();
  render();
  document.getElementById('battle-btn').addEventListener('click', runBattle);
}

function bindTabEvents() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const itemMode = tab.dataset.tab === 'item';
      document.getElementById('shop-items').classList.toggle('hidden', !itemMode);
      document.getElementById('shop-bag').classList.toggle('hidden', itemMode);
    });
  });
}

function renderShop() {
  const itemWrap = document.getElementById('shop-items');
  itemWrap.innerHTML = itemPool.map((it) => `
    <article class="shop-card">
      <h4>${it.name} · ${it.cost}💰</h4>
      <p>基础战力 ${it.basePower} | ${it.desc}</p>
      <button data-buy-item="${it.id}">购买并选中</button>
    </article>
  `).join('');

  const bagWrap = document.getElementById('shop-bag');
  bagWrap.innerHTML = bagUpgrades.map((up) => `
    <article class="shop-card">
      <h4>${up.name} · ${up.cost}💰</h4>
      <p>${up.desc}</p>
      <button data-buy-bag="${up.id}">购买扩展</button>
    </article>
  `).join('');

  itemWrap.querySelectorAll('[data-buy-item]').forEach((btn) => {
    btn.addEventListener('click', () => buyItem(btn.dataset.buyItem));
  });

  bagWrap.querySelectorAll('[data-buy-bag]').forEach((btn) => {
    btn.addEventListener('click', () => buyBag(btn.dataset.buyBag));
  });
}

function buyItem(itemId) {
  const item = itemPool.find((i) => i.id === itemId);
  if (!item) return;
  if (state.gold < item.cost) return flashSelect('樱桃币不足，先打赢几回合吧~');

  state.gold -= item.cost;
  const purchased = { ...item, uid: `${item.id}-${Date.now()}` };
  state.inventory.push(purchased);
  state.selectedShopItem = purchased.uid;
  flashSelect(`已购买 ${item.name}，点击左侧空格放置。`);
  render();
}

function buyBag(upId) {
  const up = bagUpgrades.find((u) => u.id === upId);
  if (!up) return;
  if (state.gold < up.cost) return flashSelect('樱桃币不足，无法扩展痛包。');
  if (state.bagSize >= 6) return flashSelect('当前 Demo 最大仅支持 6 x 6。');

  state.gold -= up.cost;
  state.bagSize += 1;
  const old = [...state.cells];
  const next = Array(state.bagSize * state.bagSize).fill(null);

  const oldSize = state.bagSize - 1;
  for (let r = 0; r < oldSize; r++) {
    for (let c = 0; c < oldSize; c++) {
      next[r * state.bagSize + c] = old[r * oldSize + c];
    }
  }

  state.cells = next;
  flashSelect(`痛包扩展成功：${state.bagSize} x ${state.bagSize}`);
  render();
}

function render() {
  document.getElementById('gold').textContent = state.gold;
  document.getElementById('wins').textContent = state.wins;
  document.getElementById('bag-size-label').textContent = `${state.bagSize} x ${state.bagSize}`;

  const bagGrid = document.getElementById('bag-grid');
  bagGrid.style.gridTemplateColumns = `repeat(${state.bagSize}, minmax(0, 1fr))`;
  bagGrid.innerHTML = '';

  const buffMap = getBuffMap();

  state.cells.forEach((cell, idx) => {
    const node = document.createElement('button');
    node.className = 'cell';
    node.addEventListener('click', () => placeOrRemove(idx));

    if (cell) {
      node.classList.add('occupied');
      if ((buffMap[idx] || 0) > 0) node.classList.add('buff');
      node.innerHTML = `<div class="item-chip" style="background:${cell.color}">${cell.name}<br>⚔️${cell.basePower}+${buffMap[idx] || 0}</div>`;
    } else {
      node.textContent = '空位';
    }

    bagGrid.appendChild(node);
  });

  document.getElementById('power').textContent = getTotalPower();
}

function placeOrRemove(index) {
  const has = state.cells[index];
  if (has) {
    state.cells[index] = null;
    flashSelect(`已移除 ${has.name}`);
    render();
    return;
  }

  if (!state.selectedShopItem) {
    flashSelect('请先在商店购买物品后再摆盘。');
    return;
  }

  const invIdx = state.inventory.findIndex((i) => i.uid === state.selectedShopItem);
  if (invIdx < 0) {
    flashSelect('选择物品无效，请重新购买。');
    state.selectedShopItem = null;
    return;
  }

  const [item] = state.inventory.splice(invIdx, 1);
  state.cells[index] = item;
  state.selectedShopItem = null;
  flashSelect(`摆放成功：${item.name}`);
  render();
}

function getBuffMap() {
  const size = state.bagSize;
  const buffs = Array(state.cells.length).fill(0);

  state.cells.forEach((item, idx) => {
    if (!item) return;
    const row = Math.floor(idx / size);
    const col = idx % size;

    if (item.buff.type === 'self') buffs[idx] += item.buff.value;

    if (item.buff.type === 'adjacent') {
      [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr, dc]) => {
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nc < 0 || nr >= size || nc >= size) return;
        const nIndex = nr * size + nc;
        if (state.cells[nIndex]) buffs[nIndex] += item.buff.value;
      });
    }

    if (item.buff.type === 'row') {
      for (let c = 0; c < size; c++) {
        const i = row * size + c;
        if (state.cells[i] && i !== idx) buffs[i] += item.buff.value;
      }
    }
  });

  return buffs;
}

function getTotalPower() {
  const buffs = getBuffMap();
  return state.cells.reduce((sum, item, idx) => {
    if (!item) return sum;
    return sum + item.basePower + (buffs[idx] || 0);
  }, 0);
}

function runBattle() {
  const myPower = getTotalPower();
  const enemyPower = Math.floor(Math.random() * 22) + 5;
  const won = myPower >= enemyPower;

  if (won) {
    state.wins += 1;
    state.gold += 4;
  }

  const log = [
    `我方战力：${myPower}`,
    `敌方战力：${enemyPower}`,
    won ? '结果：🎉 胜利！+1 胜场，+4 樱桃币' : '结果：💦 失败，再优化摆盘吧！',
    '（正式版可接入玩家存档池匹配 + 自动战斗动画）',
  ].join('\n');

  document.getElementById('battle-log').textContent = log;
  render();
}

function flashSelect(text) {
  document.getElementById('selected-card').innerHTML = `<h3>当前提示</h3><p>${text}</p>`;
}

init();
