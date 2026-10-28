import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();
app.use(express.json({ limit: '15mb' }));

export interface RoomState {
  roomId: string;
  totalSeeds: number;
  scannedSeeds: number[];
  stage: 'accumulating' | 'ready_to_blow' | 'blowing' | 'blooming' | 'ending';
  lastUpdated: number;
  customBgUrl: string | null;
  endingImageUrl?: string | null;
  bgDim?: number;
  bgPreset: string;
}

const rooms = new Map<string, RoomState>();

function normalizeRoomId(rawId: string | undefined): string {
  if (!rawId) return '우정반';
  try {
    return decodeURIComponent(rawId).trim() || '우정반';
  } catch {
    return String(rawId).trim() || '우정반';
  }
}

function getOrCreateRoom(roomId: string): RoomState {
  const normalizedId = normalizeRoomId(roomId);
  let room = rooms.get(normalizedId);
  if (!room) {
    room = {
      roomId: normalizedId,
      totalSeeds: 16,
      scannedSeeds: [],
      stage: 'accumulating',
      lastUpdated: Date.now(),
      customBgUrl: null,
      endingImageUrl: null,
      bgDim: 0.25,
      bgPreset: 'spring_meadow',
    };
    rooms.set(normalizedId, room);
  }
  return room;
}

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

interface ClientInfo {
  ws: WebSocket;
  roomId: string;
  role: string;
}

const clients = new Set<ClientInfo>();

function broadcastToRoom(roomId: string, message: object, sender?: WebSocket) {
  const targetId = normalizeRoomId(roomId);
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.roomId === targetId && client.ws.readyState === WebSocket.OPEN) {
      if (!sender || client.ws !== sender || (message as { echoSender?: boolean }).echoSender) {
        client.ws.send(data);
      }
    }
  }
}

wss.on('connection', (ws) => {
  let clientInfo: ClientInfo = { ws, roomId: '우정반', role: 'unknown' };
  clients.add(clientInfo);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'join') {
        clientInfo.roomId = normalizeRoomId(msg.roomId);
        clientInfo.role = msg.role || 'display';
        const room = getOrCreateRoom(clientInfo.roomId);
        ws.send(JSON.stringify({ type: 'sync', room }));
      } else if (msg.type === 'scan') {
        const targetRoomId = normalizeRoomId(msg.roomId || clientInfo.roomId);
        const room = getOrCreateRoom(targetRoomId);
        const seedNum = parseInt(String(msg.seedNumber), 10);
        if (!isNaN(seedNum) && seedNum >= 1 && seedNum <= room.totalSeeds) {
          const alreadyLit = room.scannedSeeds.includes(seedNum);
          if (!alreadyLit) {
            room.scannedSeeds = Array.from(new Set([...room.scannedSeeds, seedNum]));
            room.lastUpdated = Date.now();
            if (room.scannedSeeds.length >= room.totalSeeds && room.stage === 'accumulating') {
              room.stage = 'ready_to_blow';
            }
          }
          broadcastToRoom(room.roomId, {
            type: 'scan_result',
            seedNumber: seedNum,
            isNew: !alreadyLit,
            room,
            echoSender: true,
          });
        }
      } else if (msg.type === 'force_scan') {
        const targetRoomId = normalizeRoomId(msg.roomId || clientInfo.roomId);
        const room = getOrCreateRoom(targetRoomId);
        const seedNum = msg.seedNumber != null ? parseInt(String(msg.seedNumber), 10) : undefined;
        let isNew = false;

        if (seedNum != null && !isNaN(seedNum)) {
          if (room.scannedSeeds.includes(seedNum)) {
            // Toggle off
            room.scannedSeeds = room.scannedSeeds.filter((n) => n !== seedNum);
            if (room.scannedSeeds.length < room.totalSeeds && room.stage === 'ready_to_blow') {
              room.stage = 'accumulating';
            }
          } else {
            // Turn on
            room.scannedSeeds = Array.from(new Set([...room.scannedSeeds, seedNum])).sort((a, b) => a - b);
            isNew = true;
            if (room.scannedSeeds.length >= room.totalSeeds && room.stage === 'accumulating') {
              room.stage = 'ready_to_blow';
            }
          }
        } else {
          // Find lowest unlit seed
          let nextSeed: number | null = null;
          for (let i = 1; i <= room.totalSeeds; i++) {
            if (!room.scannedSeeds.includes(i)) {
              nextSeed = i;
              break;
            }
          }
          if (nextSeed != null) {
            room.scannedSeeds = Array.from(new Set([...room.scannedSeeds, nextSeed])).sort((a, b) => a - b);
            isNew = true;
            if (room.scannedSeeds.length >= room.totalSeeds && room.stage === 'accumulating') {
              room.stage = 'ready_to_blow';
            }
          }
        }

        room.lastUpdated = Date.now();
        broadcastToRoom(room.roomId, {
          type: 'scan_result',
          seedNumber: seedNum || 0,
          isNew,
          room,
          echoSender: true,
        });
      } else if (msg.type === 'start_blow') {
        const room = getOrCreateRoom(clientInfo.roomId);
        room.stage = 'blowing';
        room.lastUpdated = Date.now();
        broadcastToRoom(clientInfo.roomId, { type: 'state_changed', stage: 'blowing', room, echoSender: true });
      } else if (msg.type === 'set_stage') {
        const room = getOrCreateRoom(clientInfo.roomId);
        room.stage = msg.stage;
        room.lastUpdated = Date.now();
        broadcastToRoom(clientInfo.roomId, { type: 'state_changed', stage: msg.stage, room, echoSender: true });
      } else if (msg.type === 'reset') {
        const room = getOrCreateRoom(clientInfo.roomId);
        room.scannedSeeds = [];
        room.stage = 'accumulating';
        room.lastUpdated = Date.now();
        broadcastToRoom(clientInfo.roomId, { type: 'reset', room, echoSender: true });
      } else if (msg.type === 'update_config') {
        const room = getOrCreateRoom(clientInfo.roomId);
        if (typeof msg.totalSeeds === 'number' && msg.totalSeeds >= 0 && msg.totalSeeds <= 40) {
          room.totalSeeds = msg.totalSeeds;
          // Filter scannedSeeds within new bounds
          room.scannedSeeds = room.scannedSeeds.filter((n) => n <= room.totalSeeds);
        }
        if (msg.bgPreset) room.bgPreset = msg.bgPreset;
        if (msg.customBgUrl !== undefined) room.customBgUrl = msg.customBgUrl;
        if (msg.endingImageUrl !== undefined) room.endingImageUrl = msg.endingImageUrl;
        if (typeof msg.bgDim === 'number') room.bgDim = msg.bgDim;
        room.lastUpdated = Date.now();
        broadcastToRoom(clientInfo.roomId, { type: 'config_updated', room, echoSender: true });
      }
    } catch (err) {
      console.error('WS message error:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(clientInfo);
  });
});

// REST API Fallbacks
app.get('/api/rooms/:roomId', (req, res) => {
  const room = getOrCreateRoom(req.params.roomId);
  res.json(room);
});

app.post('/api/rooms/:roomId/scan', (req, res) => {
  const room = getOrCreateRoom(req.params.roomId);
  const seedNum = parseInt(String(req.body.seedNumber), 10);
  if (isNaN(seedNum) || seedNum < 1 || seedNum > room.totalSeeds) {
    res.status(400).json({ error: 'Invalid seed number' });
    return;
  }
  const isNew = !room.scannedSeeds.includes(seedNum);
  if (isNew) {
    room.scannedSeeds = Array.from(new Set([...room.scannedSeeds, seedNum]));
    room.lastUpdated = Date.now();
    if (room.scannedSeeds.length >= room.totalSeeds && room.stage === 'accumulating') {
      room.stage = 'ready_to_blow';
    }
  }
  broadcastToRoom(room.roomId, {
    type: 'scan_result',
    seedNumber: seedNum,
    isNew,
    room,
  });
  res.json({ success: true, isNew, room });
});

app.post('/api/rooms/:roomId/action', (req, res) => {
  const room = getOrCreateRoom(req.params.roomId);
  const { action, stage, totalSeeds, bgPreset, customBgUrl, endingImageUrl, bgDim } = req.body;

  if (action === 'blow') {
    room.stage = 'blowing';
  } else if (action === 'reset') {
    room.scannedSeeds = [];
    room.stage = 'accumulating';
  } else if (action === 'set_stage' && stage) {
    room.stage = stage;
  } else if (action === 'force_scan') {
    const seedNum = req.body.seedNumber != null ? Number(req.body.seedNumber) : undefined;
    if (seedNum != null && !isNaN(seedNum)) {
      if (room.scannedSeeds.includes(seedNum)) {
        // Toggle off
        room.scannedSeeds = room.scannedSeeds.filter((n) => n !== seedNum);
        if (room.scannedSeeds.length < room.totalSeeds && room.stage === 'ready_to_blow') {
          room.stage = 'accumulating';
        }
      } else {
        // Turn on
        room.scannedSeeds = Array.from(new Set([...room.scannedSeeds, seedNum])).sort((a, b) => a - b);
        if (room.scannedSeeds.length >= room.totalSeeds && room.stage === 'accumulating') {
          room.stage = 'ready_to_blow';
        }
      }
    } else {
      // Find lowest unlit
      let nextSeed: number | null = null;
      for (let i = 1; i <= room.totalSeeds; i++) {
        if (!room.scannedSeeds.includes(i)) {
          nextSeed = i;
          break;
        }
      }
      if (nextSeed != null) {
        room.scannedSeeds = Array.from(new Set([...room.scannedSeeds, nextSeed])).sort((a, b) => a - b);
        if (room.scannedSeeds.length >= room.totalSeeds && room.stage === 'accumulating') {
          room.stage = 'ready_to_blow';
        }
      }
    }
  } else if (action === 'update_config') {
    if (typeof totalSeeds === 'number') room.totalSeeds = totalSeeds;
    if (bgPreset) room.bgPreset = bgPreset;
    if (customBgUrl !== undefined) room.customBgUrl = customBgUrl;
    if (endingImageUrl !== undefined) room.endingImageUrl = endingImageUrl;
    if (typeof bgDim === 'number') room.bgDim = bgDim;
  }

  room.lastUpdated = Date.now();
  broadcastToRoom(room.roomId, {
    type: 'sync',
    room,
  });
  res.json({ success: true, room });
});

// Helper function to recursively read files in a directory
function collectFiles(dir: string, baseDir: string = dir): { path: string; content: string }[] {
  const results: { path: string; content: string }[] = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (file === 'node_modules' || file === 'dist' || file === '.git') continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results.push(...collectFiles(fullPath, baseDir));
      } else {
        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        // read text files
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          results.push({ path: relativePath, content });
        } catch {
          // binary or unreadable file
        }
      }
    }
  } catch (err) {
    console.error('Error reading files:', err);
  }
  return results;
}

// API to list all project files for client viewing and copying
app.get('/api/project/files', (_req, res) => {
  const rootFiles = ['package.json', 'tsconfig.json', 'vite.config.ts', 'index.html', 'server.ts', 'metadata.json', '.env.example'];
  const allFiles: { path: string; content: string }[] = [];

  for (const f of rootFiles) {
    const fp = path.resolve(__dirname, f);
    if (fs.existsSync(fp)) {
      allFiles.push({ path: f, content: fs.readFileSync(fp, 'utf-8') });
    }
  }

  const srcFiles = collectFiles(path.resolve(__dirname, 'src'), __dirname);
  allFiles.push(...srcFiles);

  res.json({ files: allFiles });
});

// API to download the entire codebase as a .zip file
app.get('/api/project/download-zip', async (_req, res) => {
  try {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();

    const rootFiles = ['package.json', 'tsconfig.json', 'vite.config.ts', 'index.html', 'server.ts', 'metadata.json', '.env.example'];
    for (const f of rootFiles) {
      const fp = path.resolve(__dirname, f);
      if (fs.existsSync(fp)) {
        zip.file(f, fs.readFileSync(fp, 'utf-8'));
      }
    }

    const srcFiles = collectFiles(path.resolve(__dirname, 'src'), __dirname);
    for (const sf of srcFiles) {
      zip.file(sf.path, sf.content);
    }

    // Add README.md with clear setup instructions
    const readmeContent = `# 함께 피우는 우정의 민들레꽃

태블릿(스캐너)과 대형 화면(디스플레이)을 연동하여 유아들이 함께 QR 홀씨 카드를 모아 만개시키는 협력 디지털 놀이 웹 애플리케이션입니다.

## 🚀 로컬 실행 방법

1. Node.js (v18 이상 권장)가 설치되어 있는지 확인합니다.
2. 터미널에서 의존성 패키지를 설치합니다:
   \`\`\`bash
   npm install
   \`\`\`
3. 개발 서버를 실행합니다:
   \`\`\`bash
   npm run dev
   \`\`\`
4. 브라우저에서 아래 주소로 접속합니다:
   - **대형 디스플레이**: \`http://localhost:3000/?mode=display&room=우정반\`
   - **태블릿 스캐너**: \`http://localhost:3000/?mode=scanner&room=우정반\`

## ✨ 주요 기능
- **실시간 소켓 & REST 동기화**: 여러 기기에서 동시 접속해도 1초 이내로 실시간 홀씨 점등 반영
- **브라우저 캐시 영구 보존**: 등록한 배경 이미지와 동화책 삽화, 점등 기록이 브라우저 IndexedDB에 안전하게 보존
- **하얀색 홀씨 & 확대 연출**: 대형 화면에서 더욱 돋보이는 순백의 홀씨 및 봄맞이 개화 애니메이션
- **번호 버튼 홀씨 만들기**: 번호를 입력한 뒤 버튼을 눌러 해당 번호의 홀씨를 화면에 바로 생성
`;
    zip.file('README.md', readmeContent);

    // Also include public image asset if it exists
    const publicAssetPath = path.resolve(__dirname, 'public/assets/aistudio/ca9d7539-5eb6-4685-a9ec-93867e4fb53a_f041b4bf.png');
    if (fs.existsSync(publicAssetPath)) {
      zip.file('public/assets/aistudio/ca9d7539-5eb6-4685-a9ec-93867e4fb53a_f041b4bf.png', fs.readFileSync(publicAssetPath));
    }

    const content = await zip.generateAsync({ type: 'nodebuffer' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="dandelion-friendship-app.zip"');
    res.send(content);
  } catch (err) {
    console.error('ZIP generation error:', err);
    res.status(500).json({ error: 'Failed to generate zip file' });
  }
});

// Setup Vite in Dev or Serve Static in Prod
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Dandelion Friendship app running on port ${PORT}`);
  });
}

startServer();
