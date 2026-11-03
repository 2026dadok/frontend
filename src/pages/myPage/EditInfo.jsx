import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PATHS } from "../../routes";
import useFitScale from "../../hooks/useFitScale";
import { Toast } from "../bookSearch/parts";
import { fetchEditPage, saveEditInfo } from "./myPageApi";
import { Banner, Icon, ImagePencil, ProfileImage } from "./parts";
import useProfileImages from "./useProfileImages";
import "../bookSearch/BookSearch.css"; // .bs 버튼·알림 스타일을 같이 쓴다
import "./MyPage.css";

const MAX_PASSWORD = 50; // 회원가입과 같은 규칙
const GO_BACK_MS = 800;
const TIME_PARTS = [
  { label: "시간", max: 23 },
  { label: "분", max: 59 },
];

// "0:5" 처럼 입력 중인 값을 "00:05" 로 맞춘다. 목표 시간은 시·분만 받는다 (HH:MM)
// 서버가 예전 형식("00:30:00")으로 줘도 앞의 시·분만 쓴다
const normalizeGoalTime = (value) =>
  TIME_PARTS.map((_, i) => (value.split(":")[i] ?? "").padStart(2, "0")).join(":");

// 목표 독서시간: 시 / 분을 숫자로 입력한다. 두 자리를 다 치면 다음 칸으로 넘어간다.
// 키 이벤트 대신 실제로 들어온 글자(onChange)만 보고 처리해서 한글 자판·모바일 자판에서도 같게 동작한다.
const GoalTimeInput = ({ value, onChange }) => {
  const refs = useRef([]);
  const startValue = useRef([]); // 칸에 들어올 때의 값. 첫 입력은 이 값을 지우고 새로 시작한다
  const parts = TIME_PARTS.map((_, i) => value.split(":")[i] ?? "");
  // 다음 칸으로 넘어가면 다시 그려지기 전에 이 칸의 blur 가 먼저 온다. 그래서 가장 최근 값은 ref 에 따로 둔다
  const latest = useRef(parts);
  useEffect(() => {
    latest.current = TIME_PARTS.map((_, i) => value.split(":")[i] ?? "");
  }, [value]);

  const setPart = (index, next) => {
    const copy = [...latest.current];
    copy[index] = next;
    latest.current = copy;
    onChange(copy.join(":"));
  };

  const type = (index, e) => {
    const raw = e.target.value;
    let digits = raw.replace(/\D/g, "");
    const start = startValue.current[index];
    if (start != null) {
      // 칸에 들어와 처음 친 글자: 전체 선택이 안 돼서 기존 값 사이(예: 2|2)에 끼었으면 새로 친 글자만 남긴다
      const added = raw.length - start.length;
      if (added > 0) {
        const caret = e.target.selectionStart ?? raw.length;
        digits = raw.slice(caret - added, caret).replace(/\D/g, "");
      }
      startValue.current[index] = null;
    }
    digits = digits.slice(-2);
    if (Number(digits) > TIME_PARTS[index].max) digits = String(TIME_PARTS[index].max);
    setPart(index, digits);
    if (digits.length === 2 && e.nativeEvent.inputType?.startsWith("insert")) refs.current[index + 1]?.focus();
  };

  return (
    <span className="ei-time">
      {TIME_PARTS.map((part, i) => (
        <span key={part.label} className="ei-time-part">
          {i > 0 && ":"}
          <input
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            aria-label={part.label}
            placeholder="00"
            value={parts[i]}
            onFocus={(e) => {
              startValue.current[i] = latest.current[i];
              e.target.select(); // 전체 선택: 바로 새로 칠 수 있다
            }}
            onMouseUp={(e) => {
              // 클릭으로 들어오면 마우스를 뗄 때 전체 선택이 풀리고 커서가 숫자 사이에 놓인다. 처음 한 번은 막는다
              if (startValue.current[i] != null) e.preventDefault();
            }}
            onChange={(e) => type(i, e)}
            onBlur={() => {
              startValue.current[i] = null;
              if (latest.current[i]) setPart(i, latest.current[i].padStart(2, "0"));
            }}
          />
        </span>
      ))}
    </span>
  );
};

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
        <input type={visible ? "text" : "password"} value={value} maxLength={MAX_PASSWORD} onChange={(e) => onChange(e.target.value)} />
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
  // TODO: 현재 비밀번호가 맞는지는 확인 API가 명세서에 없어서 저장할 때 서버가 판단한다 (여기서는 입력 여부만 본다)
  const passwordStatus = {
    current: passwords.current ? { ok: true } : { ok: false, text: "현재 비밀번호를 입력해주세요." },
    next: !passwords.next
      ? { ok: false, text: "새 비밀번호를 입력해주세요." }
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
    const ok = await saveEditInfo({ ...form, name: form.name.trim(), goalTime, password: changingPassword ? passwords.next : "" });
    setSaving(false);
    if (!ok) {
      showToast("저장하지 못했어요.");
      return;
    }
    showToast("저장했어요.");
    setTimeout(() => navigate(PATHS.mypage), GO_BACK_MS);
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
              <h1 className="ei-id">{form.id}</h1>

              <section className="ei-section">
                <h2>기본 정보</h2>
                <Field label="이름" icon="person">
                  <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)} />
                </Field>
                <Field label="생년월일" icon="calendar">
                  <input type="date" value={form.birthdate} onChange={(e) => update("birthdate", e.target.value)} />
                </Field>
                <Field label="목표 독서시간" icon="clock">
                  <GoalTimeInput value={form.goalTime} onChange={(v) => update("goalTime", v)} />
                </Field>
              </section>

              <section className="ei-section">
                <h2>계정</h2>
                <Field label="이메일" icon="mail" extra={form.google && <span className="ei-chip">Google 연동</span>}>
                  <input type="email" value={form.email} readOnly tabIndex={-1} aria-readonly="true" /> {/* 이메일은 바꿀 수 없다 */}
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
