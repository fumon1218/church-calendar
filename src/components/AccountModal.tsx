import React, { useState } from 'react';
import { X, Cloud, Loader2, UploadCloud } from 'lucide-react';
import { getAuth, SYNC_ENABLED } from '../utils/accountSync';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmail: string | null;
  onForcePush?: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, currentEmail, onForcePush }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pushConfirming, setPushConfirming] = useState(false);
  const [pushed, setPushed] = useState(false);

  if (!isOpen) return null;

  const reset = () => {
    setEmail('');
    setPassword('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getAuth();
    if (!auth) {
      setError('동기화 기능이 아직 설정되지 않았습니다.');
      return;
    }
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signup') {
        await auth.createUserWithEmailAndPassword(email.trim(), password);
      } else {
        await auth.signInWithEmailAndPassword(email.trim(), password);
      }
      reset();
      onClose();
    } catch (e: any) {
      if (e?.code === 'auth/email-already-in-use') setError('이미 가입된 이메일입니다. 로그인해주세요.');
      else if (e?.code === 'auth/weak-password') setError('비밀번호는 6자 이상이어야 합니다.');
      else if (e?.code === 'auth/invalid-credential' || e?.code === 'auth/wrong-password') setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      else if (e?.code === 'auth/user-not-found') setError('가입되지 않은 이메일입니다. 아래에서 계정을 만들어주세요.');
      else setError(`오류가 발생했습니다: ${e?.message || '알 수 없는 오류'}`);
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    const auth = getAuth();
    if (!auth) return;
    setBusy(true);
    try {
      await auth.signOut();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--line)] rounded-3xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 border-b border-[var(--line)] flex items-center justify-between bg-[var(--surface-soft)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center flex-shrink-0 shadow-xs">
              <Cloud className="w-4 h-4 text-[var(--primary)]" />
            </div>
            <h3 className="text-base font-serif font-bold text-[var(--ink)]">기기 간 동기화</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--surface)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          {!SYNC_ENABLED ? (
            <p className="text-xs text-[var(--ink-faint)] leading-relaxed">
              아직 동기화 기능이 설정되지 않았습니다. 관리자에게 문의해주세요.
            </p>
          ) : currentEmail ? (
            <div className="space-y-3">
              <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
                <b className="text-[var(--ink)]">{currentEmail}</b> 계정으로 로그인되어 있습니다.
                <br />
                다른 기기에서 같은 이메일로 로그인하면 이 일정 데이터가 그대로 보입니다.
              </p>
              <button
                onClick={handleLogout}
                disabled={busy}
                className="w-full py-2 text-xs font-semibold rounded-xl border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--surface-soft)] disabled:opacity-50"
              >
                로그아웃
              </button>

              {onForcePush && (
                <div className="pt-2 border-t border-[var(--line-soft)]">
                  {!pushConfirming ? (
                    <button
                      onClick={() => setPushConfirming(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold rounded-xl border border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      이 기기 데이터로 클라우드 덮어쓰기
                    </button>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                        ⚠️ 다른 기기에 있는 데이터는 무시되고, <b>지금 이 기기의 데이터로 완전히 바뀝니다.</b>
                        클라우드에 잘못된(예전) 데이터가 남아있을 때만 사용하세요.
                      </p>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setPushConfirming(false)}
                          className="flex-1 py-1.5 text-[11px] rounded-lg border border-[var(--line)] text-[var(--ink-soft)]"
                        >
                          취소
                        </button>
                        <button
                          onClick={() => {
                            onForcePush();
                            setPushConfirming(false);
                            setPushed(true);
                            setTimeout(() => setPushed(false), 2000);
                          }}
                          className="flex-1 py-1.5 text-[11px] font-semibold rounded-lg bg-amber-600 text-white"
                        >
                          확인, 덮어쓰기
                        </button>
                      </div>
                    </div>
                  )}
                  {pushed && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1.5 text-center">
                      ✓ 클라우드에 저장했습니다.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <p className="text-[10px] text-[var(--ink-faint)] leading-relaxed mb-2">
                이메일로 로그인하면, 같은 이메일로 로그인한 모바일·PC·노트북에서 일정 데이터가 똑같이 동기화됩니다.
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일"
                autoComplete="username"
                className="w-full px-3 py-2 bg-[var(--surface-soft)] border border-[var(--line)] rounded-xl text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 (6자 이상)"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="w-full px-3 py-2 bg-[var(--surface-soft)] border border-[var(--line)] rounded-xl text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
              />
              {error && (
                <p className="text-[11px] text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-50"
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {mode === 'signup' ? '계정 만들고 시작하기' : '로그인'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode((m) => (m === 'login' ? 'signup' : 'login'));
                  setError(null);
                }}
                className="w-full text-center text-[11px] text-[var(--primary)]"
              >
                {mode === 'login' ? '처음이신가요? 계정 만들기' : '이미 계정이 있으신가요? 로그인하기'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
