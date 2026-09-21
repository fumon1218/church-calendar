// 이메일 계정 기반 "내 기기끼리" 동기화 (Supabase 버전)
// 강릉분원 앱과 달리, 이건 "팀 전체 공유"가 아니라 "같은 이메일로 로그인하면
// 모바일·PC·노트북에서 내 일정이 똑같이 보인다"는 개인용 동기화입니다.
//
// Supabase 콘솔(supabase.com)에서 프로젝트를 만들고 "API Keys"에서 받은
// Project URL과 anon(publishable) 키를 아래에 붙여넣으면 켜집니다.
// 비워두면 이 기능은 자동으로 꺼지고, 지금처럼 각 브라우저에만 저장되는 방식으로 동작합니다.
//
// App.tsx / AccountModal.tsx는 Firebase 때와 똑같은 함수 이름(getAuth, watchUserDoc,
// saveUserDoc 등)을 그대로 호출합니다 - 이 파일 안에서 Supabase를 그 모양에 맞게 감싸서,
// 다른 파일은 손대지 않아도 되게 만들었습니다.

declare global {
  interface Window {
    supabase: any;
  }
}

export const SUPABASE_CONFIG = {
  url: 'https://xrubqlusyjxqngwscgzb.supabase.co',
  anonKey: 'sb_publishable_Ysd0kIWgX2s1t_iKxqDfxg_gRqm1UXn',
};

export const SYNC_ENABLED = !!(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);

let client: any = null;

function getClient() {
  if (!SYNC_ENABLED) return null;
  if (!client && window.supabase) {
    client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  }
  return client;
}

export function initSync() {
  if (!SYNC_ENABLED) return null;
  getClient();
  return { authApi: getAuth(), dbApi: getClient() };
}

function mapUser(u: any) {
  if (!u) return null;
  return { uid: u.id, email: u.email };
}

// Supabase 오류 메시지를 Firebase 스타일 코드로 바꿔서, AccountModal.tsx가 그대로 처리할 수 있게 합니다.
function mapAuthError(error: any) {
  const msg = (error?.message || '').toLowerCase();
  let code = 'auth/unknown';
  if (msg.includes('already registered') || msg.includes('already exists')) code = 'auth/email-already-in-use';
  else if (msg.includes('invalid login credentials') || msg.includes('invalid email')) code = 'auth/invalid-credential';
  else if (msg.includes('password') && (msg.includes('6') || msg.includes('short') || msg.includes('weak')))
    code = 'auth/weak-password';
  else if (msg.includes('user not found') || msg.includes('no user')) code = 'auth/user-not-found';
  const e: any = new Error(error?.message || '알 수 없는 오류');
  e.code = code;
  return e;
}

export function getAuth() {
  const c = getClient();
  if (!c) return null;
  return {
    onAuthStateChanged: (callback: (user: any) => void) => {
      c.auth.getSession().then(({ data }: any) => {
        callback(mapUser(data?.session?.user));
      });
      const { data: sub } = c.auth.onAuthStateChange((_event: string, session: any) => {
        callback(mapUser(session?.user));
      });
      return () => sub.subscription.unsubscribe();
    },
    signInWithEmailAndPassword: async (email: string, password: string) => {
      const { error } = await c.auth.signInWithPassword({ email, password });
      if (error) throw mapAuthError(error);
    },
    createUserWithEmailAndPassword: async (email: string, password: string) => {
      const { error } = await c.auth.signUp({ email, password });
      if (error) throw mapAuthError(error);
    },
    signOut: async () => {
      await c.auth.signOut();
    },
  };
}

export function getDb() {
  return getClient();
}

export interface SyncedData {
  events?: any[];
  churchConfig?: any;
  updatedAt?: number;
}

export function watchUserDoc(uid: string, onData: (data: SyncedData | null) => void, onError?: (e: any) => void) {
  const c = getClient();
  if (!c) return () => {};

  const toSyncedData = (row: any): SyncedData | null =>
    row ? { events: row.events, churchConfig: row.church_config, updatedAt: row.updated_at } : null;

  // 처음 접속했을 때 한 번 불러오기
  c.from('user_data')
    .select('*')
    .eq('user_id', uid)
    .maybeSingle()
    .then(({ data, error }: any) => {
      if (error) {
        onError?.(error);
        return;
      }
      onData(toSyncedData(data));
    });

  // 다른 기기가 바꾸면 실시간으로 반영
  const channel = c
    .channel(`user_data_${uid}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_data', filter: `user_id=eq.${uid}` },
      (payload: any) => {
        onData(toSyncedData(payload.new));
      }
    )
    .subscribe();

  return () => {
    c.removeChannel(channel);
  };
}

export async function saveUserDoc(uid: string, data: SyncedData): Promise<number> {
  const c = getClient();
  if (!c) return Date.now();
  const cleaned = JSON.parse(JSON.stringify(data));
  // updated_at은 클라이언트가 보내지 않습니다 - 서버(DB)의 트리거가 자동으로 채웁니다.
  // (기기마다 시계가 조금씩 다를 수 있어서, "누가 더 최신인지"는 항상 서버 시각 기준으로 판단합니다)
  const { data: row, error } = await c
    .from('user_data')
    .upsert({
      user_id: uid,
      events: [], // 일정은 이제 events 테이블에 개별로 저장합니다 - 이 칸은 더 안 씁니다.
      church_config: cleaned.churchConfig ?? {},
    })
    .select('updated_at')
    .single();
  if (error) {
    console.error('클라우드 저장 실패:', error);
    throw error;
  }
  return row?.updated_at ?? Date.now();
}

/* ================= 일정 개별 동기화 (events 테이블) =================
 * 예전에는 일정 목록 전체를 하나의 통짜 데이터로 저장했는데, 이러면 한쪽 기기가 저장하는 사이에
 * 다른 기기가 (아직 최신 내용을 못 받은 채로) 저장하면 서로 덮어써버리는 사고가 날 수 있었습니다.
 * 이제는 일정 하나하나를 각각 별도의 행(row)으로 저장해서, 서로 다른 일정끼리는 절대 충돌하지 않습니다.
 */

// 삭제 표시(묘비) 방식 안내
// 일정을 지울 때 행을 진짜로 지우면 "지웠다"는 기록이 어디에도 남지 않아서, 옛 일정이 남아 있는
// 다른 기기(또는 브라우저 저장소)가 로그인할 때 "클라우드에 없는 내 일정"으로 착각하고 다시 올려버립니다.
// 그래서 삭제는 행을 없애지 않고 data 안에 '__deleted' 표시를 남기는 방식으로 합니다.
// (테이블 구조는 바꿀 필요가 없습니다)
const TOMBSTONE_KEY = '__deleted';

function makeTombstone(uid: string, eventId: string) {
  return {
    id: eventId,
    user_id: uid,
    data: { id: eventId, [TOMBSTONE_KEY]: true, deletedAt: Date.now() },
  };
}

// 실패하면 빈 목록을 돌려주지 않고 오류를 던집니다.
// (빈 목록으로 착각하면 "클라우드가 비었네" 하고 이 기기의 일정을 전부 다시 올려버리기 때문입니다)
export async function fetchAllEvents(
  uid: string
): Promise<{ events: any[]; deletedIds: string[] }> {
  const c = getClient();
  if (!c) return { events: [], deletedIds: [] };
  const { data, error } = await c.from('events').select('id, data').eq('user_id', uid);
  if (error) {
    console.error('일정 전체 불러오기 실패:', error);
    throw error;
  }
  const events: any[] = [];
  const deletedIds: string[] = [];
  (data || []).forEach((row: any) => {
    if (row.data?.[TOMBSTONE_KEY]) deletedIds.push(row.id);
    else if (row.data) events.push(row.data);
  });
  return { events, deletedIds };
}

export async function upsertEvent(uid: string, event: any): Promise<void> {
  const c = getClient();
  if (!c) return;
  const cleaned = JSON.parse(JSON.stringify(event));
  const { error } = await c.from('events').upsert({
    id: cleaned.id,
    user_id: uid,
    data: cleaned,
  });
  if (error) {
    console.error('일정 저장 실패:', error);
    throw error;
  }
}

// 일정 삭제: 행을 지우지 않고 '삭제됨' 표시로 바꿉니다. (다른 기기에도 실시간으로 전달됩니다)
export async function deleteEventRemote(uid: string, eventId: string): Promise<void> {
  const c = getClient();
  if (!c) return;
  const { error } = await c.from('events').upsert(makeTombstone(uid, eventId));
  if (error) {
    console.error('일정 삭제 실패:', error);
    throw error;
  }
}

// 기존 일정을 새 목록으로 통째로 교체합니다. 새 목록에 없는 기존 일정은 '삭제됨' 표시로 바꿉니다.
// (백업 복원, 초기 예시 데이터로 되돌리기, "이 기기 데이터로 클라우드 덮어쓰기" 같은
//  "의도적으로 전체를 바꾸는" 상황에서만 씁니다 - 평소 추가/수정/삭제에는 안 씁니다)
export async function replaceAllEvents(uid: string, events: any[]): Promise<void> {
  const c = getClient();
  if (!c) return;
  const { data: existing, error: fetchError } = await c
    .from('events')
    .select('id, data')
    .eq('user_id', uid);
  if (fetchError) {
    console.error('일정 전체 교체(조회 단계) 실패:', fetchError);
    throw fetchError;
  }
  // 같은 id가 두 번 들어가면 한 번의 upsert에서 오류가 나므로 id 기준으로 하나만 남깁니다.
  const byId = new Map<string, any>();
  events.forEach((ev) => byId.set(ev.id, ev));
  const rows = Array.from(byId.values()).map((ev) => ({
    id: ev.id,
    user_id: uid,
    data: JSON.parse(JSON.stringify(ev)),
  }));
  const tombstones = (existing || [])
    .filter((r: any) => !byId.has(r.id) && !r.data?.[TOMBSTONE_KEY])
    .map((r: any) => makeTombstone(uid, r.id));
  const all = [...tombstones, ...rows];
  if (all.length === 0) return;
  const { error } = await c.from('events').upsert(all);
  if (error) {
    console.error('일정 전체 교체 실패:', error);
    throw error;
  }
}

// 다른 기기가 일정을 추가/수정/삭제하면 실시간으로 알려줍니다.
// (전체를 다시 받는 게 아니라, 바뀐 그 일정 하나만 알려주므로 다른 일정과 절대 충돌하지 않습니다)
export function watchEvents(
  uid: string,
  onChange: (event: any) => void,
  onDelete: (eventId: string) => void
) {
  const c = getClient();
  if (!c) return () => {};

  const handleUpsert = (payload: any) => {
    const row = payload.new;
    if (!row?.data) return;
    if (row.data[TOMBSTONE_KEY]) onDelete(row.id);
    else onChange(row.data);
  };

  const channel = c
    .channel(`events_${uid}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'events', filter: `user_id=eq.${uid}` },
      handleUpsert
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'events', filter: `user_id=eq.${uid}` },
      handleUpsert
    )
    // 대시보드에서 직접 행을 지운 경우를 위한 것입니다. DELETE 이벤트에는 filter를 걸 수 없어서
    // (Supabase Realtime 제약) 필터 없이 받고 여기서 내 것인지 걸러냅니다.
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'events' },
      (payload: any) => {
        const old = payload.old;
        if (old?.id && (!old.user_id || old.user_id === uid)) onDelete(old.id);
      }
    )
    .subscribe();

  return () => {
    c.removeChannel(channel);
  };
}
