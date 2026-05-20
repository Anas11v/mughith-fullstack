/* eslint-disable */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const diagrams = {
  auth_register: `sequenceDiagram
  autonumber
  participant C as Client
  participant Ctl as AuthController
  participant V as ValidationPipe
  participant S as AuthService
  participant DB as Prisma (users)
  participant B as bcrypt
  participant J as JwtService

  C->>Ctl: POST /auth/register
  Ctl->>V: validate RegisterDto
  V-->>Ctl: ok
  Ctl->>S: register(dto)
  S->>DB: findUnique({ email })
  alt email exists
    DB-->>S: user
    S-->>C: 409 Conflict
  else new email
    DB-->>S: null
    S->>B: hash(password, 10)
    B-->>S: hash
    S->>DB: user.create({...hash})
    DB-->>S: user
    S->>J: sign({ sub, role })
    J-->>S: accessToken
    S-->>C: 201 { user, accessToken }
  end`,

  auth_login: `sequenceDiagram
  autonumber
  participant C as Client
  participant Ctl as AuthController
  participant S as AuthService
  participant DB as Prisma
  participant B as bcrypt
  participant J as JwtService

  C->>Ctl: POST /auth/login
  Ctl->>S: login(dto)
  S->>DB: findUnique({ email })
  DB-->>S: user or null
  S->>B: compare(password, user.password)
  alt invalid
    B-->>S: false
    S-->>C: 401 Unauthorized
  else valid
    B-->>S: true
    S->>J: sign({ sub, role }) 24h
    J-->>S: accessToken
    S-->>C: 200 { user, accessToken }
  end`,

  auth_me: `sequenceDiagram
  autonumber
  participant C as Client
  participant G as JwtGuard
  participant J as JwtService
  participant Ctl as AuthController
  participant S as AuthService
  participant DB as Prisma

  C->>Ctl: GET /auth/me (Bearer token)
  Ctl->>G: canActivate()
  G->>J: verifyAsync(token)
  J-->>G: { sub, role }
  G->>Ctl: request.user = payload
  Ctl->>S: getProfile(userId)
  S->>DB: findUnique({ id })
  DB-->>S: user
  S-->>C: 200 { user without password }`,

  users_update_location: `sequenceDiagram
  autonumber
  participant M as Mobile App
  participant Ctl as UsersController
  participant V as ValidationPipe
  participant G as JwtGuard
  participant S as UsersService
  participant DB as Prisma

  M->>Ctl: PATCH /users/profile { latitude, longitude }
  Ctl->>G: authenticate
  G-->>Ctl: request.user = { sub, role }
  Ctl->>V: validate UpdateProfileDto
  V-->>Ctl: ok
  Ctl->>S: updateProfile(userId, dto)
  S->>DB: findUnique({ id }) — ensure exists
  DB-->>S: user
  S->>DB: user.update({ latitude, longitude })
  DB-->>S: updated
  S-->>M: 200 { user with new location }`,

  users_toggle_availability: `sequenceDiagram
  autonumber
  participant M as Donator App
  participant J as JwtGuard
  participant R as RolesGuard
  participant Ctl as UsersController
  participant S as UsersService
  participant DB as Prisma

  M->>Ctl: PATCH /users/availability { isAvailable: true }
  Ctl->>J: verify token
  J-->>Ctl: user { sub, role }
  Ctl->>R: @Roles(DONATOR)
  alt role != DONATOR
    R-->>M: 403 Forbidden
  else role = DONATOR
    R-->>Ctl: ok
    Ctl->>S: toggleAvailability(userId, true)
    S->>DB: user.update({ isAvailable: true })
    DB-->>S: updated
    S-->>M: 200 { isAvailable: true }
  end`,

  users_list_donators: `sequenceDiagram
  autonumber
  participant W as Dispatcher Web
  participant Ctl as UsersController
  participant S as UsersService
  participant DB as Prisma

  W->>Ctl: GET /users/donators?page=1&limit=20&available=true
  Ctl->>S: findDonators({ page, limit, available })
  S->>DB: $transaction [findMany(skip, take), count]
  DB-->>S: [users, total]
  S->>S: buildPaginated(data, total, page, limit)
  S-->>W: 200 { data, meta:{page,limit,total,totalPages} }`,

  notifications_send_push: `sequenceDiagram
  autonumber
  participant DS as DispatchService
  participant NS as NotificationsService
  participant DB as Prisma
  participant FS as FirebaseService
  participant FCM as Firebase Cloud Messaging

  DS->>NS: sendPush({ userId, caseId, type, message })
  NS->>DB: notification.create
  DB-->>NS: notification
  NS->>DB: user.findUnique → fcmToken
  DB-->>NS: user { fcmToken }
  alt fcmToken exists
    NS->>FS: sendToDevice(token, payload)
    alt credentials set
      FS->>FCM: messaging().send()
      FCM-->>FS: ok
    else stub mode
      FS->>FS: log only
    end
  end`,

  notifications_mark_all: `sequenceDiagram
  autonumber
  participant C as Client
  participant G as JwtGuard
  participant Ctl as NotificationsController
  participant S as NotificationsService
  participant DB as Prisma

  C->>Ctl: PATCH /notifications/read-all
  Ctl->>G: verify token
  G-->>Ctl: userId = sub
  Ctl->>S: markAllRead(userId)
  S->>DB: updateMany({ userId, read:false }, { read:true })
  DB-->>S: { count: N }
  S-->>C: 200 { count: N }`,

  cases_create: `sequenceDiagram
  autonumber
  participant D as Dispatcher
  participant Ctl as CasesController
  participant S as CasesService
  participant G as GeocodingService
  participant N as Nominatim (OSM)
  participant DB as Prisma
  participant Dx as DispatchService
  participant H as Haversine
  participant NS as NotificationsService
  participant FS as FirebaseService

  D->>Ctl: POST /cases { address, severity, radiusKm, lat?, lng? }
  Ctl->>S: create(userId, dto)
  alt no lat/lng
    S->>G: geocode(address)
    G->>N: GET /search?q=address
    N-->>G: { lat, lon }
    G-->>S: LatLng
  end
  S->>DB: case.create({ OPEN, expiresAt: +5min })
  DB-->>S: case
  S->>Dx: findAndNotify(case)
  Dx->>DB: findMany donators(available, verified, !busy, lat/lng)
  DB-->>Dx: candidates
  loop per candidate
    Dx->>H: haversineDistanceKm(case, donator)
    H-->>Dx: km
  end
  Dx->>Dx: filter ≤ radius, sort asc, top N
  loop top N
    Dx->>NS: sendPush(CASE_ALERT)
    NS->>DB: notification.create
    NS->>FS: sendToDevice
  end
  Ctl-->>D: 201 { case }`,

  cases_close: `sequenceDiagram
  autonumber
  participant D as Dispatcher
  participant Ctl as CasesController
  participant S as CasesService
  participant DB as Prisma
  participant NS as NotificationsService

  D->>Ctl: PATCH /cases/:id/close { outcome }
  Ctl->>S: close(caseId, dto)
  S->>DB: case.findUnique
  DB-->>S: case
  alt already CLOSED
    S-->>D: 400 Bad Request
  else
    S->>DB: $transaction begin
    DB->>DB: case.update({ CLOSED, closedAt, outcome })
    DB->>DB: user.update(assignedTo, { isBusy:false })
    S->>DB: $transaction commit
    S->>NS: sendPush(CASE_CLOSED to donator)
    S-->>D: 200 { closed case }
  end`,

  cases_ambulance_info: `sequenceDiagram
  autonumber
  participant D as Dispatcher
  participant R as RolesGuard
  participant Ctl as CasesController
  participant S as CasesService
  participant DB as Prisma
  participant NS as NotificationsService

  D->>Ctl: PATCH /cases/:id/ambulance-info { plate, eta, crew }
  Ctl->>R: require DISPATCHER/AMBULANCE_CREW/ADMIN
  R-->>Ctl: ok
  Ctl->>S: updateAmbulanceInfo(id, dto)
  S->>DB: case.findUnique
  DB-->>S: case
  alt status NOT in {ASSIGNED, ON_SCENE}
    S-->>D: 400 Bad Request
  else
    S->>DB: case.update({ ambulancePlate, eta, crew })
    DB-->>S: updated
    S->>NS: sendPush(donator, GENERAL, updated info)
    S-->>D: 200 { case }
  end`,

  cases_panic: `sequenceDiagram
  autonumber
  participant A as Ambulance Crew App
  participant R as RolesGuard (AMBULANCE_CREW only)
  participant Ctl as CasesController
  participant S as CasesService
  participant DB as Prisma
  participant NS as NotificationsService
  participant L as Logger

  A->>Ctl: PATCH /cases/:id/panic
  Ctl->>R: require AMBULANCE_CREW
  alt other role
    R-->>A: 403 Forbidden
  else allowed
    R-->>Ctl: ok
    Ctl->>S: triggerPanic(caseId, userId)
    S->>DB: case.findUnique → createdById
    S->>DB: case.update({ panicTriggered:true })
    DB-->>S: updated
    S->>NS: sendPush(dispatcher, GENERAL, "panic")
    S->>L: warn "Panic triggered"
    S-->>A: 200 { case }
  end`,

  cases_expiry_cron: `sequenceDiagram
  autonumber
  participant T as @Cron EVERY_30s
  participant S as CasesService
  participant DB as Prisma
  participant L as Logger

  T->>S: expireOldOpenCases()
  S->>DB: updateMany({ status:OPEN, expiresAt < now }, { status:EXPIRED })
  DB-->>S: { count }
  alt count > 0
    S->>L: log "Expired N OPEN cases"
  end`,

  dispatch_accept: `sequenceDiagram
  autonumber
  participant A as Donator A
  participant B as Donator B
  participant Ctl as DispatchController
  participant S as DispatchService
  participant DB as Prisma
  participant NS as NotificationsService
  participant SC as StreamChatService

  par race
    A->>Ctl: POST /dispatch/:id/accept
    B->>Ctl: POST /dispatch/:id/accept
  end
  Ctl->>S: acceptCase(caseId, donatorId)
  S->>DB: user.findUnique — check !isBusy
  DB-->>S: donator
  S->>DB: $transaction
  DB->>DB: updateMany({id, status:OPEN} → ASSIGNED)
  alt count = 1 (winner)
    DB->>DB: user.update(isBusy=true)
    S->>NS: cancelForCase (others)
    NS->>DB: notification.create (CASE_CANCELLED) per donator
    S->>NS: sendPush(dispatcher, CASE_ASSIGNED)
    S->>SC: createChannelForCase(caseId, disp, donator)
    S-->>A: 201 ASSIGNED
  else count = 0 (loser)
    S-->>B: 409 Conflict
  end`,

  dispatch_nearby: `sequenceDiagram
  autonumber
  participant W as Dispatcher Web
  participant R as RolesGuard
  participant Ctl as DispatchController
  participant S as DispatchService
  participant DB as Prisma
  participant H as Haversine

  W->>Ctl: GET /dispatch/:caseId/nearby
  Ctl->>R: require DISPATCHER/ADMIN
  R-->>Ctl: ok
  Ctl->>S: getNearbyDonators(caseId)
  S->>DB: case.findUnique → lat, lng, radiusKm
  DB-->>S: case
  S->>DB: user.findMany (indexed: role, available, verified, !busy, lat/lng)
  DB-->>S: candidates
  loop per candidate
    S->>H: haversineDistanceKm
    H-->>S: km
  end
  S->>S: filter ≤ radius, sort asc
  S-->>W: 200 [ {donator, distanceKm, etaMinutes} ]`,

  location_connect: `sequenceDiagram
  autonumber
  participant M as Donator App
  participant LG as LocationGateway (/location)
  participant J as JwtService
  participant Map as userSockets Map
  participant SIO as Socket.io Namespace

  M->>LG: connect /location { auth: { token } }
  LG->>J: verifyAsync(token)
  alt invalid token
    J-->>LG: error
    LG-->>M: disconnect(true)
  else valid
    J-->>LG: { sub, role }
    LG->>Map: existing = get(sub)
    alt existing socket
      LG->>SIO: in(oldId).disconnectSockets(true)
    end
    LG->>Map: set(sub, client.id)
    LG-->>M: connected
  end`,

  location_update: `sequenceDiagram
  autonumber
  participant W as Dispatcher Web
  participant M as Donator App
  participant LG as LocationGateway
  participant DB as Prisma
  participant H as Haversine
  participant SIO as Socket.io Room case:<id>

  W->>LG: emit location:subscribe { caseId }
  LG->>SIO: client.join(case:<id>)
  LG-->>W: { ok:true }

  M->>LG: emit location:update { caseId, lat, lng }
  LG->>DB: user.update({ lat, lng })
  LG->>LG: lastSeen.set(userId, now)
  LG->>DB: case.findUnique → case coords
  LG->>H: haversineDistanceKm(donator, case)
  H-->>LG: distanceKm
  LG->>LG: estimateEtaMinutes
  LG->>SIO: broadcast location:update { donatorId, distance, eta }
  SIO-->>W: location:update payload`,

  location_signal_lost: `sequenceDiagram
  autonumber
  participant I as @Interval(10s)
  participant LG as LocationGateway
  participant Map as lastSeen Map
  participant SIO as Socket.io

  I->>LG: checkSignalLost()
  LG->>Map: iterate entries
  loop per userId,lastAt
    alt now - lastAt > 30s
      LG->>SIO: server.emit(location:signal-lost, {donatorId, lastSeenAt})
      LG->>Map: delete(userId)
    end
  end`,

  chat_auto_channel: `sequenceDiagram
  autonumber
  participant D as Donator
  participant DS as DispatchService
  participant DB as Prisma
  participant SC as StreamChatService
  participant API as Stream Chat API

  D->>DS: acceptCase (see dispatch_accept)
  DS->>DB: $transaction (status ASSIGNED, isBusy=true)
  DS->>SC: createChannelForCase(caseId, dispId, donatorId)
  alt credentials set
    SC->>API: upsertUsers
    SC->>API: channel.create
    API-->>SC: ok
  else stub
    SC->>SC: log + return stub
  end
  SC-->>DS: { channelId, channelType, members }
  DS-->>D: 201 ASSIGNED (channel silently ready)`,

  chat_manual_channel: `sequenceDiagram
  autonumber
  participant C as Client
  participant Ctl as ChatController
  participant S as ChatService
  participant DB as Prisma
  participant SC as StreamChatService

  C->>Ctl: POST /chat/case/:id/channel
  Ctl->>S: createChannelForCase(caseId)
  S->>DB: case.findUnique
  DB-->>S: case
  alt no donator assigned or finished
    S-->>C: 400 Bad Request
  else
    S->>SC: createChannelForCase
    SC-->>S: { channelId, channelType, members }
    S-->>C: 201 { channel info }
  end`,

  chat_token: `sequenceDiagram
  autonumber
  participant M as Mobile/Web App
  participant J as JwtGuard
  participant Ctl as ChatController
  participant S as ChatService
  participant SC as StreamChatService

  M->>Ctl: GET /chat/token
  Ctl->>J: verify token → userId
  J-->>Ctl: ok
  Ctl->>S: generateToken(userId)
  S->>SC: generateToken(userId)
  alt credentials set
    SC->>SC: client.createToken(userId)
  else stub
    SC->>SC: return stub-token-<userId>
  end
  SC-->>S: token
  S-->>M: 200 { token }`,

  e2e_full_lifecycle: `sequenceDiagram
  autonumber
  actor D as Dispatcher
  actor Donor as Donator
  participant API as Mugeeth API
  participant WS as /location WS
  participant FCM as FCM
  participant SC as Stream Chat

  D->>API: POST /cases (status → OPEN)
  API->>FCM: CASE_ALERT to eligible donators
  API-->>Donor: push alert
  Donor->>API: POST /dispatch/:id/accept
  API->>API: $transaction ASSIGNED + isBusy=true
  API->>SC: create channel (auto)
  API->>FCM: CASE_CANCELLED to other donators
  API->>FCM: CASE_ASSIGNED to dispatcher
  API-->>Donor: 201 ASSIGNED
  Donor->>WS: connect /location
  loop every ~5s
    Donor->>WS: location:update
    WS-->>D: location:update broadcast
  end
  D->>API: PATCH /cases/:id/ambulance-info
  API->>FCM: info update to donator
  Donor->>API: PATCH /cases/:id/status ON_SCENE
  D->>API: PATCH /cases/:id/close { outcome }
  API->>API: CLOSED + isBusy=false
  API->>FCM: CASE_CLOSED to donator
  Donor->>API: GET /cases/history (includes case)`,

  voip_connect: `sequenceDiagram
  autonumber
  participant C as Client
  participant VG as VoipGateway (/voip)
  participant J as JwtService
  participant Map as userSockets Map
  participant NS as Socket.io Namespace

  C->>VG: connect /voip { auth: { token } }
  VG->>J: verifyAsync(token)
  alt invalid
    J-->>VG: error
    VG-->>C: disconnect(true)
  else valid
    J-->>VG: { sub, role }
    VG->>Map: existing = get(sub)
    alt existing socket
      VG->>NS: in(oldId).disconnectSockets(true)
    end
    VG->>Map: set(sub, client.id)
    VG-->>C: connected
  end`,

  voip_offer: `sequenceDiagram
  autonumber
  participant A as Caller App
  participant VG as VoipGateway
  participant Map as userSockets Map
  participant NS as Socket.io
  participant B as Callee App

  A->>VG: emit call:offer { caseId, targetUserId, sdpOffer }
  VG->>VG: verify client.data.userId
  VG->>Map: targetSocketId = get(targetUserId)
  alt target offline
    VG-->>A: ack { ok:false, error:"offline" }
  else online
    VG->>NS: to(targetSocketId).emit(call:incoming)
    NS-->>B: call:incoming { caseId, callerId, sdpOffer }
    VG-->>A: ack { ok:true }
  end`,

  voip_answer: `sequenceDiagram
  autonumber
  participant A as Caller
  participant VG as VoipGateway
  participant Map as userSockets Map
  participant NS as Socket.io
  participant B as Callee

  B->>VG: emit call:answer { caseId, targetUserId, sdpAnswer }
  VG->>Map: get(targetUserId) → callerSocketId
  alt caller offline
    VG-->>B: ack { ok:false, error:"offline" }
  else online
    VG->>NS: to(callerSocketId).emit(call:answered)
    NS-->>A: call:answered { caseId, calleeId, sdpAnswer }
    VG-->>B: ack { ok:true }
  end
  Note over A,B: WebRTC peer connection now established\\naudio streams peer-to-peer (not via server)`,

  voip_ice: `sequenceDiagram
  autonumber
  participant A as Peer A
  participant VG as VoipGateway
  participant NS as Socket.io
  participant B as Peer B

  par ICE negotiation (bidirectional)
    A->>VG: call:ice-candidate { targetUserId: B, candidate }
    VG->>NS: to(B-socket).emit(call:ice-candidate, { fromId: A, candidate })
    NS-->>B: call:ice-candidate
  and
    B->>VG: call:ice-candidate { targetUserId: A, candidate }
    VG->>NS: to(A-socket).emit(call:ice-candidate, { fromId: B, candidate })
    NS-->>A: call:ice-candidate
  end
  Note over A,B: Both peers exchange ICE until best network path is found`,

  voip_end: `sequenceDiagram
  autonumber
  participant A as Peer A
  participant VG as VoipGateway
  participant NS as Socket.io
  participant B as Peer B

  A->>VG: emit call:end { caseId, targetUserId: B }
  VG->>NS: to(B-socket).emit(call:ended, { caseId, fromId: A })
  NS-->>B: call:ended
  VG-->>A: ack { ok:true }
  Note over A,B: Both sides close RTCPeerConnection locally`,

  health_check: `sequenceDiagram
  autonumber
  participant LB as Load Balancer
  participant Ctl as HealthController
  participant HC as HealthCheckService
  participant PI as PrismaHealthIndicator
  participant DB as PostgreSQL

  LB->>Ctl: GET /health
  Ctl->>HC: check([prismaIndicator.pingCheck])
  HC->>PI: ping
  PI->>DB: SELECT 1
  DB-->>PI: ok
  PI-->>HC: up
  HC-->>Ctl: { database: up }
  Ctl-->>LB: 200 { status: ok }`,
};

const diagramsDir = path.resolve(__dirname, '..', 'diagrams');
fs.mkdirSync(diagramsDir, { recursive: true });

const mmdc = path.resolve(__dirname, '..', 'node_modules', '.bin', 'mmdc');

let count = 0;
for (const [name, body] of Object.entries(diagrams)) {
  const mmdPath = path.join(diagramsDir, `${name}.mmd`);
  const pngPath = path.join(diagramsDir, `${name}.png`);
  fs.writeFileSync(mmdPath, body);
  execSync(
    `"${mmdc}" -i "${mmdPath}" -o "${pngPath}" -b white -w 1600 -H 1200 --scale 2`,
    { stdio: 'inherit' },
  );
  count += 1;
}
console.log(`\nGenerated ${count} sequence diagrams in ${diagramsDir}`);
