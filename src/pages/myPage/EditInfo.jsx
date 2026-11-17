import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PATHS } from "../../routes";
import useFitScale from "../../hooks/useFitScale";
import { Toast } from "../bookSearch/parts";
import GoalTimeInput from "../../components/goalTime/GoalTimeInput";
import { normalizeGoalTime } from "../../components/goalTime/goalTime";
import { fetchEditPage, saveEditInfo } from "./myPageApi";
import { logout, PASSWORD_MAX, passwordRuleError, withdraw } from "../../api/auth";
import { Banner, Icon, ImagePencil, ProfileImage } from "./parts";
import useProfileImages from "./useProfileImages";
import "../bookSearch/BookSearch.css"; // .bs 버튼·알림 스타일을 같이 쓴다
import "./MyPage.css";

const GO_BACK_MS = 800;

const Field = ({ label, icon, children, extra }) => (
  <label className="ei-field">
    <span className="ei-label">{label}</span>
    <span className="ei-box">
      <Icon name={icon} size={26} className="ei-icon" />
      {children}
      {extra}
    </span>
  </label>
);

// 비밀번호 칸: 눈 모양으로 보이기/숨기기, 아래에 검사 결과 문구 (입력하는 동안 바로 바뀐다)
const PasswordField = ({ label, value, onChange, status }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="ei-password">
      <Field
        label={label}
        icon="key"
        extra={
          <button type="button" className="ei-eye" aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"} onClick={() => setVisible(!visible)}>
            <Icon name={visible ? "eyeOpen" : "eyeClosed"} size={26} />
          </button>
        }
      >
        <input type={visible ? "text" : "password"} value={value} maxLength={PASSWORD_MAX} onChange={(e) => onChange(e.target.value)} />
      </Field>
      <p className={`ei-check ${status?.ok ? "ok" : "error"}`}>{status?.text}</p>
    </div>
  );
};

const EMPTY_PASSWORDS = { current: "", next: "", confirm: "" };

// 회원정보 수정: 기본 정보(이름·생년월일·목표 독서시간), 계정(이메일·비밀번호 변경), 프로필/배경 이미지
const EditInfo = () => {
  const scale = useFitScale({ fitHeight: false });
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  const [triedSave, setTriedSave] = useState(false); // 저장을 눌렀으면 빈 칸에도 안내 문구를 보여준다
  const [saving, setSaving] = useState(false);
  const { images, setImages, changeImage, resetToDefault, toast, showToast } = useProfileImages();

  useEffect(() => {
    let alive = true;
    fetchEditPage().then((result) => {
      if (!alive) return;
      setForm(result);
      setImages({ profile: result.profileImage, background: result.backgroundImage });
    });
    return () => {
      alive = false;
    };
  }, [setImages]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const setPassword = (key, value) => {
    setPasswords((prev) => ({ ...prev, [key]: value }));
  };

  // 비밀번호 검사. 입력할 때마다 다시 계산한다.
  // 현재 비밀번호가 맞는지는 확인 API 가 없어서 저장할 때 서버가 판단한다 (여기서는 입력 여부만 본다)
  const passwordStatus = {
    current: passwords.current ? { ok: true } : { ok: false, text: "현재 비밀번호를 입력해주세요." },
    next: !passwords.next
      ? { ok: false, text: "새 비밀번호를 입력해주세요." }
      : passwordRuleError(passwords.next)
        ? { ok: false, text: passwordRuleError(passwords.next) }
        : passwords.next === passwords.current
          ? { ok: false, text: "현재 비밀번호와 달라야 해요." }
          : { ok: true, text: "사용할 수 있어요." },
    confirm:
      passwords.confirm && passwords.confirm === passwords.next
        ? { ok: true, text: "비밀번호가 일치해요." }
        : { ok: false, text: "비밀번호가 일치하지 않아요." },
  };
  // 아직 아무것도 안 친 칸은 저장을 누르기 전까지 조용히 둔다
  const shownStatus = (key) => (passwords[key] || triedSave ? passwordStatus[key] : null);

  const save = async () => {
    if (form.needLogin) {
      showToast("로그인이 필요해요.");
      return;
    }
    if (!form.name.trim()) {
      showToast("이름을 입력해주세요.");
      return;
    }
    const goalTime = normalizeGoalTime(form.goalTime);
    if (goalTime === "00:00") {
      showToast("목표 독서시간을 입력해주세요.");
      return;
    }
    const changingPassword = passwordOpen && Object.values(passwords).some(Boolean);
    if (changingPassword) {
      setTriedSave(true);
      if (!Object.values(passwordStatus).every((r) => r.ok)) {
        showToast("비밀번호를 확인해주세요.");
        return;
      }
    }
    setSaving(true);
    // 현재 비밀번호가 비어 있으면 위의 passwordStatus 검사에서 이미 막힌다
    const ok = await saveEditInfo({
      ...form,
      name: form.name.trim(),
      goalTime,
      password: changingPassword ? passwords.next : "",
      currentPassword: changingPassword ? passwords.current : "",
    });
    setSaving(false);
    if (!ok) {
      showToast("저장하지 못했어요.");
      return;
    }
    showToast("저장했어요.");
    setTimeout(() => navigate(PATHS.mypage), GO_BACK_MS);
  };

  const signOut = async () => {
    await logout();
    navigate(PATHS.guest, { replace: true });
  };

  const leave = async () => {
    if (!window.confirm("정말 탈퇴할까요?\n탈퇴하면 이 계정으로 다시 로그인할 수 없어요.")) return;
    if (!(await withdraw())) {
      showToast("탈퇴하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    navigate(PATHS.guest, { replace: true });
  };

  return (
    <div className="bs mp">
      <Toast message={toast} />
      <div className="mp-stage" style={{ "--s": scale }}>
        <div className="mp-top">
          <Banner image={images.background} className="short" />
          <ImagePencil label="배경 이미지 바꾸기" className="banner-edit" onPick={(file) => changeImage("background", file)} canReset={Boolean(images.background)} onReset={() => resetToDefault("background")} />
        </div>

        <div className="ei-panel">
          {form && (
            <div className="ei-column">
              <div className="mp-profile ei-profile">
                <ProfileImage image={images.profile} size={111} />
                <ImagePencil label="프로필 사진 바꾸기" className="avatar" onPick={(file) => changeImage("profile", file)} canReset={Boolean(images.profile)} onReset={() => resetToDefault("profile")} />
              </div>
              <h1 className="ei-id">{form.needLogin ? "로그인이 필요해요." : form.id}</h1>

              <section className="ei-section">
                <h2>기본 정보</h2>
                <Field label="이름" icon="person">
                  <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)} />
                </Field>
                <Field label="생년월일" icon="calendar">
                  <input type="date" value={form.birthdate} onChange={(e) => update("birthdate", e.target.value)} />
                </Field>
                <Field label="목표 독서시간" icon="clock">
                  <GoalTimeInput className="ei-time" value={form.goalTime} onChange={(v) => update("goalTime", v)} />
                </Field>
              </section>

              <section className="ei-section">
                <h2>계정</h2>
                <Field label="이메일" icon="mail">
                  {/* 이메일은 바꿀 수 없다 */}
                  <input type="email" value={form.email} readOnly tabIndex={-1} aria-readonly="true" />
                </Field>

                {passwordOpen ? (
                  <>
                    <p className="ei-label ei-sub">비밀번호 변경</p>
                    <PasswordField label="현재 비밀번호" value={passwords.current} onChange={(v) => setPassword("current", v)} status={shownStatus("current")} />
                    <PasswordField label="새 비밀번호" value={passwords.next} onChange={(v) => setPassword("next", v)} status={shownStatus("next")} />
                    <PasswordField label="새 비밀번호 확인" value={passwords.confirm} onChange={(v) => setPassword("confirm", v)} status={shownStatus("confirm")} />
                  </>
                ) : (
                  // 누르면 현재 / 새 / 새 비밀번호 확인 칸이 펼쳐진다
                  <button type="button" className="ei-field ei-password-open" onClick={() => setPasswordOpen(true)}>
                    <span className="ei-label">비밀번호 변경</span>
                    <span className="ei-box">
                      <Icon name="key" size={26} className="ei-icon" />
                      <span className="ei-mask">*********</span>
                      <Icon name="eyeClosed" size={26} className="ei-eye" />
                    </span>
                  </button>
                )}
              </section>

              {!form.needLogin && (
                <div className="ei-account-actions">
                  <button type="button" onClick={signOut}>로그아웃</button>
                  <button type="button" className="danger" onClick={leave}>회원탈퇴</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {form && (
        <button type="button" className="ei-save" disabled={saving} onClick={save}>
          {saving ? "저장 중…" : "저장하기"}
        </button>
      )}
    </div>
  );
};

export default EditInfo;
