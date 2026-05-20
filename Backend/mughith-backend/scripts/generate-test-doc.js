/* eslint-disable */
const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  LevelFormat,
  PageBreak,
  ImageRun,
} = require('docx');

const BLUE = '0F3460';
const RED = 'E94560';
const HEADER_FILL = '0F3460';
const ROW_ALT_FILL = 'F5F7FF';

const border = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

const PAGE_WIDTH = 12240;
const MARGIN = 1440;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 9360

const diagramsDir = path.resolve(__dirname, '..', 'diagrams');

function pngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

function diagramImage(name, caption) {
  const filePath = path.join(diagramsDir, `${name}.png`);
  if (!fs.existsSync(filePath)) {
    return p(`[Missing diagram: ${name}]`);
  }
  const { width, height } = pngDimensions(filePath);
  const targetWidth = 640;
  const targetHeight = Math.round((height / width) * targetWidth);

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      children: [
        new ImageRun({
          type: 'png',
          data: fs.readFileSync(filePath),
          transformation: { width: targetWidth, height: targetHeight },
          altText: {
            title: caption,
            description: caption,
            name: name,
          },
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 220 },
      children: [
        new TextRun({ text: caption, italics: true, size: 18, color: '555555' }),
      ],
    }),
  ];
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text })],
    spacing: { before: 360, after: 200 },
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text })],
    spacing: { before: 280, after: 160 },
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text })],
    spacing: { before: 220, after: 120 },
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...opts })],
    spacing: { after: 120 },
  });
}

function code(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: 'Consolas', size: 18 })],
    spacing: { after: 80 },
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    children: [new TextRun({ text })],
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: HEADER_FILL, type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [
      new Paragraph({
        children: [
          new TextRun({ text, bold: true, color: 'FFFFFF', size: 20 }),
        ],
      }),
    ],
  });
}

function bodyCell(text, width, alt = false) {
  const children = Array.isArray(text)
    ? text.map((t) => new Paragraph({ children: [new TextRun({ text: t, size: 20 })] }))
    : [new Paragraph({ children: [new TextRun({ text, size: 20 })] })];
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: alt ? { fill: ROW_ALT_FILL, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children,
  });
}

function testCasesTable(rows) {
  const widths = [900, 2200, 1800, 2400, 2060];
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('ID', widths[0]),
      headerCell('Description', widths[1]),
      headerCell('Preconditions', widths[2]),
      headerCell('Steps', widths[3]),
      headerCell('Expected Result', widths[4]),
    ],
  });
  const bodyRows = rows.map(
    (r, i) =>
      new TableRow({
        children: [
          bodyCell(r.id, widths[0], i % 2 === 1),
          bodyCell(r.desc, widths[1], i % 2 === 1),
          bodyCell(r.pre, widths[2], i % 2 === 1),
          bodyCell(r.steps, widths[3], i % 2 === 1),
          bodyCell(r.expected, widths[4], i % 2 === 1),
        ],
      }),
  );
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: [headerRow, ...bodyRows],
  });
}

/* ─────────────────────────────────────────────────────────────────────
   CONTENT
   ───────────────────────────────────────────────────────────────────── */

const content = [];

// ── TITLE PAGE ──
content.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 2000, after: 200 },
    children: [
      new TextRun({
        text: 'Mugeeth Emergency Response System',
        bold: true,
        size: 44,
        color: BLUE,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new TextRun({
        text: 'Backend Test Cases & Sequence Diagrams',
        bold: true,
        size: 32,
        color: RED,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 2000 },
    children: [
      new TextRun({
        text: 'NestJS + Prisma + PostgreSQL + Socket.io',
        size: 24,
        italics: true,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: 'Sprint 1 + Sprint 2 + Sprint 3 Coverage', size: 22, bold: true }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: '114 automated tests across 14 suites — all passing', size: 22 }),
    ],
    spacing: { after: 200 },
  }),
  pageBreak(),
);

// Introduction
content.push(
  h1('1. Introduction'),
  p('This document captures the verification plan for the Mugeeth backend, covering every endpoint and real-time event delivered during Sprint 1 (Foundation) and Sprint 2 (Core Flow + Real-Time).'),
  p('For each feature we present:'),
  bullet('A table of test cases with ID, description, preconditions, steps, and expected result.'),
  bullet('A UML sequence diagram describing the actor/message flow.'),

  h2('1.1 Test Environment'),
  bullet('Framework: NestJS 11 (TypeScript)'),
  bullet('ORM: Prisma 6'),
  bullet('Database: PostgreSQL 16 (Docker)'),
  bullet('Realtime: Socket.io 4 via @nestjs/websockets'),
  bullet('Test runner: Jest 29 + Supertest 7 + socket.io-client 4'),
  bullet('External services: OpenStreetMap Nominatim (real, free) for geocoding; Firebase Admin SDK and Stream Chat SDK wired with graceful fallbacks when no credentials are provided.'),

  h2('1.2 Test Summary'),
  p('All tests are executed via: npm run test:e2e'),
  p('Result: 14 test suites passed, 114 tests passed, 0 failed.'),

  pageBreak(),
);

// ── AUTH MODULE ──
content.push(
  h1('2. Authentication Module'),
  p('The authentication module handles user registration, login, and profile retrieval. JWT tokens are signed with HS256 and expire after 24 hours (per SRS REQ-5.3.3). Passwords are hashed with bcrypt (10 rounds).'),

  h2('2.1 Test Cases'),
  testCasesTable([
    { id: 'AU-01', desc: 'Register a new user', pre: 'Empty users table', steps: 'POST /auth/register with valid payload', expected: '201 + user (role=DONATOR, no password) + accessToken' },
    { id: 'AU-02', desc: 'Reject duplicate email', pre: 'User exists', steps: 'POST /auth/register with same email', expected: '409 Conflict' },
    { id: 'AU-03', desc: 'Reject weak password', pre: '—', steps: 'POST /auth/register with password < 8 chars', expected: '400 Bad Request' },
    { id: 'AU-04', desc: 'Reject invalid email format', pre: '—', steps: 'POST /auth/register with malformed email', expected: '400 Bad Request' },
    { id: 'AU-05', desc: 'Login with valid credentials', pre: 'User exists', steps: 'POST /auth/login with correct credentials', expected: '200 + user + accessToken' },
    { id: 'AU-06', desc: 'Login with wrong password', pre: 'User exists', steps: 'POST /auth/login with wrong password', expected: '401 Unauthorized' },
    { id: 'AU-07', desc: 'Login with unknown email', pre: 'No user matches', steps: 'POST /auth/login with unknown email', expected: '401 Unauthorized' },
    { id: 'AU-08', desc: 'Get current user with token', pre: 'User registered', steps: 'GET /auth/me with Bearer token', expected: '200 + user (no password)' },
    { id: 'AU-09', desc: 'Reject /auth/me without token', pre: '—', steps: 'GET /auth/me (no auth)', expected: '401 Unauthorized' },
    { id: 'AU-10', desc: 'Reject /auth/me with invalid token', pre: '—', steps: 'GET /auth/me with random token', expected: '401 Unauthorized' },
  ]),

  h2('2.2 Sequence Diagram — User Registration'),
  ...diagramImage('auth_register', 'Figure 2.1 — POST /auth/register flow'),

  h2('2.3 Sequence Diagram — Login'),
  ...diagramImage('auth_login', 'Figure 2.2 — POST /auth/login flow'),

  h2('2.4 Sequence Diagram — Get Current Profile'),
  ...diagramImage('auth_me', 'Figure 2.3 — GET /auth/me flow'),

  pageBreak(),
);

// ── USERS MODULE ──
content.push(
  h1('3. Users Module'),
  p('Manages user profiles, donator availability toggling, admin verification, and donator listings with pagination.'),

  h2('3.1 Test Cases'),
  testCasesTable([
    { id: 'US-01', desc: 'Get current user profile', pre: 'Authenticated user', steps: 'GET /users/profile', expected: '200 + profile' },
    { id: 'US-02', desc: 'Reject profile without token', pre: '—', steps: 'GET /users/profile (no auth)', expected: '401' },
    { id: 'US-03', desc: 'Update name/phone/certification', pre: 'Authenticated donator', steps: 'PATCH /users/profile with fields', expected: '200 + fields persisted' },
    { id: 'US-04', desc: 'Update lat/lng (FLAW #2 fix)', pre: 'Authenticated donator', steps: 'PATCH /users/profile { latitude, longitude }', expected: '200 + coords stored' },
    { id: 'US-05', desc: 'Reject unknown profile field', pre: 'Authenticated user', steps: 'PATCH with non-DTO field', expected: '400' },
    { id: 'US-06', desc: 'Toggle availability for DONATOR', pre: 'Donator authenticated', steps: 'PATCH /users/availability { isAvailable: true }', expected: '200' },
    { id: 'US-07', desc: 'Reject availability for ADMIN', pre: 'Admin authenticated', steps: 'PATCH /users/availability', expected: '403' },
    { id: 'US-08', desc: 'Reject empty availability body', pre: 'Donator authenticated', steps: 'PATCH /users/availability {}', expected: '400' },
    { id: 'US-09', desc: 'Admin verifies donator', pre: 'Admin + donator exist', steps: 'PATCH /users/:id/verify', expected: '200 + isVerified=true' },
    { id: 'US-10', desc: 'Donator cannot verify', pre: '—', steps: 'PATCH /users/:other/verify', expected: '403' },
    { id: 'US-11', desc: 'Dispatcher lists donators', pre: '2 donators exist', steps: 'GET /users/donators', expected: '200 + paginated response' },
    { id: 'US-12', desc: 'Filter by availability', pre: 'Mix of donators', steps: 'GET /users/donators?available=true', expected: '200 + filtered' },
    { id: 'US-13', desc: 'Pagination with page & limit', pre: '5 donators', steps: 'GET /users/donators?page=1&limit=2', expected: '200 + 2 items, totalPages=3' },
    { id: 'US-14', desc: 'Donator cannot list donators', pre: 'Donator authenticated', steps: 'GET /users/donators', expected: '403' },
  ]),

  h2('3.2 Sequence Diagram — Update Profile with Location (FLAW #2)'),
  ...diagramImage('users_update_location', 'Figure 3.1 — PATCH /users/profile with coordinates'),

  h2('3.3 Sequence Diagram — Toggle Availability'),
  ...diagramImage('users_toggle_availability', 'Figure 3.2 — PATCH /users/availability'),

  h2('3.4 Sequence Diagram — List Donators (Paginated)'),
  ...diagramImage('users_list_donators', 'Figure 3.3 — GET /users/donators'),

  pageBreak(),
);

// ── NOTIFICATIONS ──
content.push(
  h1('4. Notifications Module'),
  p('Stores case alerts in PostgreSQL and sends push notifications via Firebase Cloud Messaging when the user has a registered fcmToken. If Firebase credentials are not provided, sending falls back to a logged no-op (DB persistence still happens).'),

  h2('4.1 Test Cases'),
  testCasesTable([
    { id: 'NO-01', desc: 'Empty list', pre: '0 notifications', steps: 'GET /notifications', expected: '200 + []' },
    { id: 'NO-02', desc: 'List own notifications', pre: '3 CASE_ALERT', steps: 'GET /notifications', expected: '200 + 3 items desc' },
    { id: 'NO-03', desc: 'Do not leak others', pre: 'Other user has 2', steps: 'GET /notifications', expected: '200 + []' },
    { id: 'NO-04', desc: 'Filter unread', pre: '1 read + 1 unread', steps: 'GET /notifications?unread=true', expected: '200 + 1 item' },
    { id: 'NO-05', desc: 'Reject without token', pre: '—', steps: 'GET /notifications', expected: '401' },
    { id: 'NO-06', desc: 'Mark single as read', pre: '1 notification', steps: 'PATCH /notifications/:id/read', expected: '200 + read=true' },
    { id: 'NO-07', desc: 'Reject others notification', pre: 'Belongs to other', steps: 'PATCH /notifications/:id/read', expected: '404' },
    { id: 'NO-08', desc: 'Mark all as read', pre: '4 unread', steps: 'PATCH /notifications/read-all', expected: '200 + {count:4}' },
    { id: 'NO-09', desc: 'Does not affect others', pre: 'Other has 3', steps: 'PATCH /notifications/read-all', expected: 'Other still 3 unread' },
  ]),

  h2('4.2 Sequence Diagram — Push Notification (DB + FCM)'),
  ...diagramImage('notifications_send_push', 'Figure 4.1 — NotificationsService.sendPush'),

  h2('4.3 Sequence Diagram — Mark All As Read'),
  ...diagramImage('notifications_mark_all', 'Figure 4.2 — PATCH /notifications/read-all'),

  pageBreak(),
);

// ── CASES MODULE ──
content.push(
  h1('5. Cases Module'),
  p('Models the emergency case lifecycle: OPEN → ASSIGNED → ON_SCENE → CLOSED, with OPEN → EXPIRED as a timeout path. Integrates with OpenStreetMap Nominatim, Dispatch, and Notifications.'),

  h2('5.1 Test Cases'),
  testCasesTable([
    { id: 'CA-01', desc: 'Create case (DISPATCHER)', pre: 'Dispatcher authenticated', steps: 'POST /cases with coords', expected: '201 + OPEN, expiresAt set' },
    { id: 'CA-02', desc: 'Reject DONATOR create', pre: 'Donator auth', steps: 'POST /cases', expected: '403' },
    { id: 'CA-03', desc: 'Reject invalid severity', pre: 'Dispatcher auth', steps: 'POST with severity="X"', expected: '400' },
    { id: 'CA-04', desc: 'List paginated', pre: '2 cases', steps: 'GET /cases', expected: '200 + data length 2' },
    { id: 'CA-05', desc: 'Filter by severity', pre: 'Mixed severities', steps: 'GET /cases?severity=CRITICAL', expected: '200 + matching' },
    { id: 'CA-06', desc: 'Donator cannot list', pre: 'Donator auth', steps: 'GET /cases', expected: '403' },
    { id: 'CA-07', desc: 'Status ASSIGNED→ON_SCENE', pre: 'Case ASSIGNED', steps: 'PATCH /cases/:id/status', expected: '200 + ON_SCENE' },
    { id: 'CA-08', desc: 'Reject CLOSED→OPEN', pre: 'Case CLOSED', steps: 'PATCH /status OPEN', expected: '400' },
    { id: 'CA-09', desc: 'Close + free donator', pre: 'Case ON_SCENE', steps: 'PATCH /close', expected: '200 + isBusy=false' },
    { id: 'CA-10', desc: 'Ambulance info (FLAW #3)', pre: 'Case ASSIGNED', steps: 'PATCH /ambulance-info', expected: '200 + fields updated' },
    { id: 'CA-11', desc: 'Reject ambulance-info OPEN', pre: 'Case OPEN', steps: 'PATCH /ambulance-info', expected: '400' },
    { id: 'CA-12', desc: 'Panic AMBULANCE_CREW (FLAW #4)', pre: 'Ambulance crew auth', steps: 'PATCH /panic', expected: '200 + panicTriggered' },
    { id: 'CA-13', desc: 'Reject panic for DISPATCHER', pre: 'Dispatcher auth', steps: 'PATCH /panic', expected: '403' },
    { id: 'CA-14', desc: 'Cron expires (FLAW #1)', pre: 'expiresAt < now', steps: 'Invoke expireOldOpenCases', expected: 'status → EXPIRED' },
    { id: 'CA-15', desc: 'Cron skips future', pre: 'expiresAt > now', steps: 'Invoke expireOldOpenCases', expected: 'still OPEN' },
  ]),

  h2('5.2 Sequence Diagram — Create Emergency Case'),
  ...diagramImage('cases_create', 'Figure 5.1 — POST /cases with geocoding + dispatch trigger'),

  h2('5.3 Sequence Diagram — Close Case'),
  ...diagramImage('cases_close', 'Figure 5.2 — PATCH /cases/:id/close'),

  h2('5.4 Sequence Diagram — Ambulance Info Update (FLAW #3)'),
  ...diagramImage('cases_ambulance_info', 'Figure 5.3 — PATCH /cases/:id/ambulance-info'),

  h2('5.5 Sequence Diagram — Traffic Panic Button (FLAW #4)'),
  ...diagramImage('cases_panic', 'Figure 5.4 — PATCH /cases/:id/panic'),

  h2('5.6 Sequence Diagram — Case Expiry Cron (FLAW #1)'),
  ...diagramImage('cases_expiry_cron', 'Figure 5.5 — @Cron EVERY_30_SECONDS'),

  pageBreak(),
);

// ── DISPATCH MODULE ──
content.push(
  h1('6. Dispatch Module'),
  p('Drives donator matching using Haversine distance, atomic first-to-claim acceptance, and automatic chat-channel provisioning on accept.'),

  h2('6.1 Test Cases'),
  testCasesTable([
    { id: 'DI-01', desc: 'First-to-claim wins; second 409', pre: '2 eligible donators', steps: 'Both POST /accept', expected: '1st 201, 2nd 409' },
    { id: 'DI-02', desc: 'Busy donator blocked', pre: 'isBusy=true', steps: 'POST /accept', expected: '409' },
    { id: 'DI-03', desc: 'Non-DONATOR 403', pre: 'Dispatcher auth', steps: 'POST /accept', expected: '403' },
    { id: 'DI-04', desc: 'Cancels alerts for others', pre: 'Other donator has alert', steps: 'Accept case', expected: 'Other gets CASE_CANCELLED' },
    { id: 'DI-05', desc: 'Reject marks read', pre: 'Unread alert exists', steps: 'POST /reject', expected: 'alert.read=true' },
    { id: 'DI-06', desc: 'Nearby sorted by distance', pre: '2 eligible donators', steps: 'GET /nearby', expected: 'sorted asc' },
    { id: 'DI-07', desc: 'Nearby excludes busy/unavailable', pre: 'Busy + unavailable', steps: 'GET /nearby', expected: '200 + []' },
  ]),

  h2('6.2 Sequence Diagram — First-to-Claim Accept'),
  ...diagramImage('dispatch_accept', 'Figure 6.1 — POST /dispatch/:caseId/accept (atomic)'),

  h2('6.3 Sequence Diagram — Nearby Donators Query'),
  ...diagramImage('dispatch_nearby', 'Figure 6.2 — GET /dispatch/:caseId/nearby'),

  pageBreak(),
);

// ── LOCATION WS ──
content.push(
  h1('7. Location Module (WebSocket)'),
  p('Real-time GPS streaming on the isolated /location namespace. JWT is verified from handshake.auth.token. Duplicate sockets for the same user are forcibly disconnected (FLAW #7). Events are broadcast to the per-case room case:<caseId>.'),

  h2('7.1 Test Cases'),
  testCasesTable([
    { id: 'LO-01', desc: 'Reject connection without token', pre: '—', steps: 'Connect /location with fake token', expected: 'Disconnected' },
    { id: 'LO-02', desc: 'Broadcast to subscribed room', pre: 'Dispatcher subscribed', steps: 'Donator emits location:update', expected: 'Dispatcher receives broadcast' },
    { id: 'LO-03', desc: 'Stale socket disconnected (FLAW #7)', pre: 'Same user reconnects', steps: 'Second connect', expected: 'First socket disconnected' },
    { id: 'NS-01', desc: '/location accepts authed', pre: 'Valid token', steps: 'io(/location, auth)', expected: 'Connected' },
    { id: 'NS-02', desc: '/location rejects missing token', pre: 'No auth', steps: 'io(/location)', expected: 'Disconnected' },
    { id: 'NS-03', desc: 'No leak to default namespace', pre: 'Both namespaces connected', steps: 'Emit on /location', expected: 'Not delivered to /' },
  ]),

  h2('7.2 Sequence Diagram — WebSocket Connection & Auth'),
  ...diagramImage('location_connect', 'Figure 7.1 — /location handshake + JWT check + stale cleanup'),

  h2('7.3 Sequence Diagram — Location Update Broadcast'),
  ...diagramImage('location_update', 'Figure 7.2 — location:update → broadcast to case room'),

  h2('7.4 Sequence Diagram — Signal Lost Detection'),
  ...diagramImage('location_signal_lost', 'Figure 7.3 — @Interval(10s) signal-lost scan'),

  pageBreak(),
);

// ── CHAT ──
content.push(
  h1('8. Chat Module'),
  p('Wraps the Stream Chat SDK for per-case messaging. If Stream credentials are present, real channels and tokens are created. Otherwise, the service returns stub values so the flow is fully exercisable end-to-end without paid credentials.'),

  h2('8.1 Test Cases'),
  testCasesTable([
    { id: 'CH-01', desc: 'Create channel ASSIGNED', pre: 'Case assigned', steps: 'POST /chat/case/:id/channel', expected: '201 + channelId + members' },
    { id: 'CH-02', desc: 'Reject no donator', pre: 'Case OPEN', steps: 'POST /chat/case/:id/channel', expected: '400' },
    { id: 'CH-03', desc: 'Reject CLOSED case', pre: 'Case CLOSED', steps: 'POST /chat/case/:id/channel', expected: '400' },
    { id: 'CH-04', desc: 'Get chat token', pre: 'Authenticated user', steps: 'GET /chat/token', expected: '200 + token string' },
    { id: 'CH-05', desc: 'Reject token no auth', pre: '—', steps: 'GET /chat/token', expected: '401' },
  ]),

  h2('8.2 Sequence Diagram — Auto-Create Channel on Accept (FLAW #5)'),
  ...diagramImage('chat_auto_channel', 'Figure 8.1 — Auto channel creation inside acceptCase'),

  h2('8.3 Sequence Diagram — Manual Channel Fetch'),
  ...diagramImage('chat_manual_channel', 'Figure 8.2 — POST /chat/case/:id/channel'),

  h2('8.4 Sequence Diagram — Token Generation'),
  ...diagramImage('chat_token', 'Figure 8.3 — GET /chat/token'),

  pageBreak(),
);

// ── VoIP WS ──
content.push(
  h1('9. VoIP Module (WebSocket)'),
  p('Relays WebRTC signaling between two parties on the isolated /voip namespace. The backend only routes signaling messages (SDP offer, answer, ICE candidates); actual audio streams flow peer-to-peer. JWT is verified from handshake.auth.token and stale sockets for the same user are disconnected.'),

  h2('9.1 Test Cases'),
  testCasesTable([
    { id: 'VO-01', desc: 'Reject /voip connection without valid token', pre: '—', steps: 'Connect /voip with fake token', expected: 'Disconnected' },
    { id: 'VO-02', desc: 'Relay call:offer to target as call:incoming', pre: 'Caller + callee connected', steps: 'Caller emits call:offer', expected: 'Callee receives call:incoming { callerId, caseId, sdpOffer }' },
    { id: 'VO-03', desc: 'Relay call:answer as call:answered', pre: 'Both connected', steps: 'Callee emits call:answer', expected: 'Caller receives call:answered { calleeId, sdpAnswer }' },
    { id: 'VO-04', desc: 'Relay call:ice-candidate bidirectionally', pre: 'Both connected', steps: 'Peer A emits candidate', expected: 'Peer B receives call:ice-candidate { fromId, candidate }' },
    { id: 'VO-05', desc: 'Relay call:end as call:ended', pre: 'Both connected', steps: 'A emits call:end targeting B', expected: 'B receives call:ended { fromId }' },
    { id: 'VO-06', desc: 'Offer to offline target returns ack error', pre: 'Only caller connected', steps: 'Emit call:offer to non-connected target', expected: 'Ack { ok:false, error:"target offline" }' },
  ]),

  h2('9.2 Sequence Diagram — VoIP Connection & Auth'),
  ...diagramImage('voip_connect', 'Figure 9.1 — /voip handshake + JWT check'),

  h2('9.3 Sequence Diagram — Call Offer'),
  ...diagramImage('voip_offer', 'Figure 9.2 — call:offer → call:incoming'),

  h2('9.4 Sequence Diagram — Call Answer'),
  ...diagramImage('voip_answer', 'Figure 9.3 — call:answer → call:answered'),

  h2('9.5 Sequence Diagram — ICE Candidate Exchange'),
  ...diagramImage('voip_ice', 'Figure 9.4 — Bidirectional call:ice-candidate relay'),

  h2('9.6 Sequence Diagram — Call End'),
  ...diagramImage('voip_end', 'Figure 9.5 — call:end → call:ended'),

  pageBreak(),
);

// ── END-TO-END ──
content.push(
  h1('10. End-to-End Emergency Flow'),
  p('The full life cycle, exercised by test/case-lifecycle.e2e-spec.ts.'),

  h2('10.1 Test Case'),
  testCasesTable([
    {
      id: 'E2E-01',
      desc: 'Complete emergency response lifecycle',
      pre: 'Dispatcher + Donator (available, verified, lat/lng)',
      steps: 'POST /cases → alert → POST /accept → PATCH /ambulance-info → PATCH status ON_SCENE → PATCH /close → GET /cases/history',
      expected: 'Case transitions OPEN→ASSIGNED→ON_SCENE→CLOSED; isBusy toggles true then false; history contains closed case.',
    },
  ]),

  h2('10.2 Sequence Diagram — Full Lifecycle'),
  ...diagramImage('e2e_full_lifecycle', 'Figure 10.1 — End-to-end emergency response flow'),

  pageBreak(),
);

// ── HEALTH ──
content.push(
  h1('11. Health Check'),
  p('Liveness + readiness probe used by deployment platforms. Skips rate limiting via @SkipThrottle().'),

  h2('11.1 Test Case'),
  testCasesTable([
    {
      id: 'HE-01',
      desc: 'Health endpoint returns DB status',
      pre: 'PostgreSQL running',
      steps: 'GET /health',
      expected: '200 + { status: "ok", database: up }',
    },
  ]),

  h2('11.2 Sequence Diagram — Health Check'),
  ...diagramImage('health_check', 'Figure 11.1 — GET /health'),

  pageBreak(),
);

// ── ADDITIONAL TEST SUITES (Sprint 3) ──
content.push(
  h1('12. Additional Test Suites (Sprint 3)'),
  p('Four additional Jest suites harden the system around guards, DTO validation, edge cases, and the pure math helpers used for distance and ETA.'),

  h2('12.1 Guards & Decorators Suite'),
  p('File: test/guards.e2e-spec.ts — validates JwtGuard, RolesGuard, and @CurrentUser() decorator.'),
  testCasesTable([
    { id: 'GU-01', desc: 'Valid Bearer token grants access', pre: 'Registered user', steps: 'GET /users/profile with Bearer', expected: '200' },
    { id: 'GU-02', desc: 'Missing Authorization header', pre: '—', steps: 'GET /users/profile', expected: '401' },
    { id: 'GU-03', desc: 'Non-Bearer scheme (Basic)', pre: '—', steps: 'GET /users/profile with Basic auth', expected: '401' },
    { id: 'GU-04', desc: 'Malformed JWT', pre: '—', steps: 'GET /users/profile with "not.a.jwt"', expected: '401' },
    { id: 'GU-05', desc: 'Token with forged signature', pre: '—', steps: 'GET /users/profile with token signed by wrong secret', expected: '401' },
    { id: 'GU-06', desc: 'DISPATCHER can access /cases', pre: 'Dispatcher auth', steps: 'GET /cases', expected: '200' },
    { id: 'GU-07', desc: 'DONATOR blocked from /cases', pre: 'Donator auth', steps: 'GET /cases', expected: '403' },
    { id: 'GU-08', desc: 'ADMIN can verify donator', pre: 'Admin auth', steps: 'PATCH /users/:id/verify', expected: '200' },
    { id: 'GU-09', desc: 'DISPATCHER cannot verify donator', pre: 'Dispatcher auth', steps: 'PATCH /users/:id/verify', expected: '403' },
    { id: 'GU-10', desc: 'Only AMBULANCE_CREW can trigger /panic', pre: 'All 4 roles tested', steps: 'PATCH /cases/:id/panic', expected: 'AMBULANCE_CREW 200; others 403' },
    { id: 'GU-11', desc: '@CurrentUser extracts sub correctly', pre: 'Registered user', steps: 'GET /auth/me', expected: '200 + own id' },
  ]),

  h2('12.2 DTO Validation Suite'),
  p('File: test/dto-validation.e2e-spec.ts — exercises class-validator rules across DTOs.'),
  testCasesTable([
    { id: 'DV-01', desc: 'RegisterDto: missing name', pre: '—', steps: 'POST /auth/register without name', expected: '400' },
    { id: 'DV-02', desc: 'RegisterDto: empty password', pre: '—', steps: 'POST /auth/register with password ""', expected: '400' },
    { id: 'DV-03', desc: 'RegisterDto: forbidNonWhitelisted', pre: '—', steps: 'POST /auth/register with role="ADMIN"', expected: '400' },
    { id: 'DV-04', desc: 'UpdateProfileDto: non-numeric latitude', pre: 'Authed', steps: 'PATCH /users/profile with latitude="abc"', expected: '400' },
    { id: 'DV-05', desc: 'UpdateProfileDto: invalid date', pre: 'Authed', steps: 'PATCH /users/profile with certExpiry="yesterday"', expected: '400' },
    { id: 'DV-06', desc: 'CreateCaseDto: missing severity', pre: 'Dispatcher', steps: 'POST /cases without severity', expected: '400' },
    { id: 'DV-07', desc: 'CreateCaseDto: short address', pre: 'Dispatcher', steps: 'POST /cases with address="x"', expected: '400' },
    { id: 'DV-08', desc: 'CreateCaseDto: invalid latitude range', pre: 'Dispatcher', steps: 'POST /cases with latitude=500', expected: '400' },
    { id: 'DV-09', desc: 'CreateCaseDto: radiusKm > 50', pre: 'Dispatcher', steps: 'POST /cases with radiusKm=999', expected: '400' },
    { id: 'DV-10', desc: 'UpdateStatusDto: invalid status', pre: 'Assigned case', steps: 'PATCH /cases/:id/status with status="XYZ"', expected: '400' },
    { id: 'DV-11', desc: 'CloseCaseDto: outcome < 5 chars', pre: 'ON_SCENE case', steps: 'PATCH /cases/:id/close with outcome="ok"', expected: '400' },
    { id: 'DV-12', desc: 'PaginationQuery: page=0', pre: 'Dispatcher', steps: 'GET /users/donators?page=0', expected: '400' },
    { id: 'DV-13', desc: 'PaginationQuery: limit > 100', pre: 'Dispatcher', steps: 'GET /users/donators?limit=500', expected: '400' },
  ]),

  h2('12.3 Edge Cases Suite'),
  p('File: test/edge-cases.e2e-spec.ts — verifies 404/409 behavior, illegal transitions, and history filtering.'),
  testCasesTable([
    { id: 'EC-01', desc: 'GET /cases/:id returns 404 for unknown id', pre: 'Dispatcher', steps: 'GET /cases/<zero-uuid>', expected: '404' },
    { id: 'EC-02', desc: 'PATCH status on unknown case', pre: 'Dispatcher', steps: 'PATCH /cases/<zero-uuid>/status', expected: '404' },
    { id: 'EC-03', desc: 'Closing a CLOSED case returns 400', pre: 'Case CLOSED', steps: 'PATCH /cases/:id/close', expected: '400' },
    { id: 'EC-04', desc: 'Accepting non-OPEN case fails 409', pre: 'Case EXPIRED', steps: 'POST /dispatch/:id/accept', expected: '409' },
    { id: 'EC-05', desc: 'Geocoding failure without coords', pre: 'Dispatcher', steps: 'POST /cases with gibberish address + no lat/lng', expected: 'Either 201 (OSM resolved) or 400' },
    { id: 'EC-06', desc: 'Donator history shows only own assigned cases', pre: 'Donator + 2 closed cases (1 assigned)', steps: 'GET /cases/history', expected: '200 + 1 case only' },
    { id: 'EC-07', desc: 'Chat channel 404 for unknown case', pre: 'Authed', steps: 'POST /chat/case/<zero>/channel', expected: '404' },
    { id: 'EC-08', desc: 'Accept when own user is deleted', pre: 'Token issued, user deleted', steps: 'POST /dispatch/:id/accept', expected: '404' },
  ]),

  h2('12.4 Distance & ETA Helpers Suite'),
  p('File: test/location-eta.e2e-spec.ts — pure unit tests for haversineDistanceKm and estimateEtaMinutes used by the dispatch matcher and location gateway.'),
  testCasesTable([
    { id: 'LE-01', desc: 'Zero distance for identical coords', pre: '—', steps: 'haversineDistanceKm(A, A)', expected: '≈ 0 km' },
    { id: 'LE-02', desc: '≈0.5 km for very close points', pre: '—', steps: 'lat 21.4225 vs 21.427, same lng', expected: '0.45 < d < 0.55 km' },
    { id: 'LE-03', desc: 'Makkah → Jeddah ≈ 70 km', pre: '—', steps: '(21.4225, 39.8262) to (21.4858, 39.1925)', expected: '60 < d < 90 km' },
    { id: 'LE-04', desc: 'Distance is symmetric', pre: '—', steps: 'dist(a,b) vs dist(b,a)', expected: 'equal' },
    { id: 'LE-05', desc: 'Antipodal points ≈ 20 000 km', pre: '—', steps: '(0,0) to (0,180)', expected: '19 000 < d < 20 100 km' },
    { id: 'LE-06', desc: 'ETA 0 minutes for zero distance', pre: '—', steps: 'estimateEtaMinutes(0)', expected: '0' },
    { id: 'LE-07', desc: 'ETA ≈ 15 min for 10 km at 40 km/h', pre: '—', steps: 'estimateEtaMinutes(10)', expected: '15' },
    { id: 'LE-08', desc: 'ETA ≈ 75 min for 50 km', pre: '—', steps: 'estimateEtaMinutes(50)', expected: '75' },
    { id: 'LE-09', desc: 'ETA rounds to integer minutes', pre: '—', steps: 'estimateEtaMinutes(3.3)', expected: 'integer' },
  ]),

  pageBreak(),
);

// ── APPENDIX ──
content.push(
  h1('Appendix A — Cross-cutting Protections'),
  h2('A.1 Security Layers'),
  bullet('Helmet middleware: HSTS, X-Content-Type-Options, X-Frame-Options.'),
  bullet('@nestjs/throttler: 100 req/min per client.'),
  bullet('JwtGuard per controller; JWT expiry = 24h (SRS REQ-5.3.3).'),
  bullet('RolesGuard + @Roles() enforces role-based access.'),
  bullet('Global ValidationPipe with whitelist + forbidNonWhitelisted + transform.'),

  h2('A.2 Database Indexes (Performance)'),
  bullet('users: (role, isAvailable, isBusy) — fast dispatch matching.'),
  bullet('cases: (status), (status, expiresAt), (assignedToId).'),
  bullet('notifications: (userId, read), (userId, createdAt).'),

  h2('A.3 Test Execution'),
  code('npm run test:e2e'),
  p('Expected output: 14 test suites passed, 114 tests passed.'),

  h2('A.4 Test Files Inventory'),
  bullet('auth.e2e-spec.ts (10 tests) — Sprint 1'),
  bullet('users.e2e-spec.ts (14 tests) — Sprint 1'),
  bullet('notifications.e2e-spec.ts (9 tests) — Sprint 1'),
  bullet('cases.e2e-spec.ts (15 tests) — Sprint 2'),
  bullet('dispatch.e2e-spec.ts (7 tests) — Sprint 2'),
  bullet('chat.e2e-spec.ts (5 tests) — Sprint 2'),
  bullet('case-lifecycle.e2e-spec.ts (1 test) — Sprint 2'),
  bullet('location.e2e-spec.ts (3 tests) — Sprint 2'),
  bullet('namespace.e2e-spec.ts (3 tests) — Sprint 2'),
  bullet('voip.e2e-spec.ts (6 tests) — Sprint 3'),
  bullet('guards.e2e-spec.ts (11 tests) — Sprint 3'),
  bullet('dto-validation.e2e-spec.ts (13 tests) — Sprint 3'),
  bullet('edge-cases.e2e-spec.ts (8 tests) — Sprint 3'),
  bullet('location-eta.e2e-spec.ts (9 tests) — Sprint 3'),

  h2('A.5 FLAWS Resolved'),
  bullet('FLAW #1 — Case expiry cron implemented.'),
  bullet('FLAW #2 — Donator location REST fallback.'),
  bullet('FLAW #3 — Ambulance info endpoint.'),
  bullet('FLAW #4 — Panic button restricted to AMBULANCE_CREW.'),
  bullet('FLAW #5 — Chat channel auto-created on accept.'),
  bullet('FLAW #6 — Location gateway on isolated /location namespace.'),
  bullet('FLAW #7 — Stale socket cleanup on reconnect.'),
);

/* ─────────────────────────────────────────────────────────────────────
   DOCUMENT
   ───────────────────────────────────────────────────────────────────── */

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: BLUE },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2',
        name: 'Heading 2',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: BLUE },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 },
      },
      {
        id: 'Heading3',
        name: 'Heading 3',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: RED },
        paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
      {
        reference: 'numbers',
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: '%1.',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: PAGE_WIDTH, height: 15840 },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      children: content,
    },
  ],
});

const outPath = path.resolve(__dirname, '..', 'Mugeeth_Test_Cases_and_Sequence_Diagrams.docx');
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outPath, buffer);
  console.log('Wrote:', outPath, '(' + (buffer.length / 1024).toFixed(1) + ' KB)');
});
