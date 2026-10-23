/**
 * 그룹 초대 링크 랜딩.
 *
 * 앱이 설치돼 있으면 OS 가 App Links / Universal Links 로 이 페이지를 건너뛰고 앱을 연다.
 * 따라서 이 스크립트가 도는 상황은 둘 중 하나다.
 *   ① 앱이 없다            → 스토어로 보낸다
 *   ② 인앱 브라우저로 열렸다 → OS 가 링크를 가로채지 못했으므로 직접 열어줘야 한다
 */

const INVITE_CODE_LENGTH = 6;
const APP_SCHEME_URL = "fryday://group/join?code=";

const elements = {
  codeSection: document.getElementById("codeSection"),
  codeValue: document.getElementById("codeValue"),
  copyBtn: document.getElementById("copyBtn"),
  openAppBtn: document.getElementById("openAppBtn"),
  installHint: document.getElementById("installHint"),
  inAppNotice: document.getElementById("inAppNotice"),
  inAppNoticeText: document.getElementById("inAppNoticeText"),
  openExternalBtn: document.getElementById("openExternalBtn"),
  storeButtons: document.getElementById("storeButtons"),
  appStoreLink: document.getElementById("appStoreLink"),
  playStoreLink: document.getElementById("playStoreLink"),
};

/** 링크에 코드가 없거나 형식이 깨졌으면 코드 영역을 숨기고 설치 안내만 남긴다. */
function readInviteCode() {
  const raw = new URLSearchParams(window.location.search).get("code") ?? "";
  const normalized = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  return normalized.length === INVITE_CODE_LENGTH ? normalized : null;
}

function detectPlatform() {
  const ua = navigator.userAgent;

  if (/android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  return "other";
}

/**
 * 인앱 브라우저 판별. 카카오톡은 외부 브라우저로 넘기는 공식 스킴이 있어 따로 구분한다.
 * 나머지는 넘길 방법이 없어 안내만 띄운다.
 */
function detectInAppBrowser() {
  const ua = navigator.userAgent;

  if (/KAKAOTALK/i.test(ua)) return "kakaotalk";
  if (/Instagram/i.test(ua)) return "instagram";
  if (/NAVER\(inapp/i.test(ua)) return "naver";
  if (/Line\//i.test(ua)) return "line";
  if (/FBAN|FBAV/i.test(ua)) return "facebook";
  return null;
}

function showInviteCode(code) {
  elements.codeValue.textContent = code;
  elements.codeSection.hidden = false;
  elements.copyBtn.addEventListener("click", () => copyCode(code));
}

/**
 * 일반 브라우저에서는 앱이 있으면 OS 가 이미 앱을 열었으므로, 여기까지 왔다면 앱이 없다는 뜻이다.
 * 이때 앱 스킴 버튼은 "주소가 유효하지 않음" 오류만 내므로 인앱 브라우저에서만 보여준다.
 */
function showOpenAppButton(code) {
  elements.openAppBtn.href = APP_SCHEME_URL + encodeURIComponent(code);
  elements.openAppBtn.hidden = false;
}

async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code);
    flashCopyLabel("복사됐어요");
  } catch {
    // 구형 인앱 브라우저는 Clipboard API 가 막혀 있다. 코드를 선택 상태로 만들어 직접 복사하게 둔다.
    selectCodeText();
    flashCopyLabel("길게 눌러 복사해주세요");
  }
}

function flashCopyLabel(message) {
  const original = "코드 복사하기";

  elements.copyBtn.textContent = message;
  window.setTimeout(() => {
    elements.copyBtn.textContent = original;
  }, 2000);
}

function selectCodeText() {
  const range = document.createRange();
  range.selectNodeContents(elements.codeValue);

  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

/** 설치된 사람에게만 필요한 플랫폼의 스토어 버튼을 앞에 둔다. */
function orderStoreButtons(platform) {
  if (platform === "android") {
    elements.storeButtons.prepend(elements.playStoreLink);
    return;
  }
  if (platform === "ios") {
    elements.storeButtons.prepend(elements.appStoreLink);
  }
}

function setUpInAppBrowserNotice(inAppBrowser, platform) {
  if (!inAppBrowser) return;

  elements.inAppNotice.hidden = false;

  if (inAppBrowser === "kakaotalk") {
    elements.inAppNoticeText.textContent =
      "카카오톡 안에서는 앱이 바로 열리지 않아요";
    elements.openExternalBtn.hidden = false;
    elements.openExternalBtn.addEventListener("click", openInExternalBrowser);
    return;
  }

  elements.inAppNoticeText.textContent =
    platform === "ios"
      ? "앱이 바로 열리지 않으면 Safari 로 이 링크를 열어주세요"
      : "앱이 바로 열리지 않으면 Chrome 으로 이 링크를 열어주세요";
}

/**
 * 카카오톡 전용 탈출 경로.
 * Android 는 Chrome 을 직접 지정하는 intent 가 더 확실하고, iOS 는 카카오 스킴만 쓸 수 있다.
 */
function openInExternalBrowser() {
  // #fragment 가 남으면 Android intent 문자열에 # 이 두 번 들어가 깨진다.
  const currentUrl = window.location.origin + window.location.pathname + window.location.search;

  if (detectPlatform() === "android") {
    const withoutScheme = currentUrl.replace(/^https?:\/\//, "");
    window.location.href =
      "intent://" + withoutScheme + "#Intent;scheme=https;package=com.android.chrome;end";
    return;
  }

  window.location.href =
    "kakaotalk://web/openExternal?url=" + encodeURIComponent(currentUrl);
}

function initialize() {
  const code = readInviteCode();
  const platform = detectPlatform();
  const inAppBrowser = detectInAppBrowser();

  if (code) {
    showInviteCode(code);
    elements.installHint.hidden = false;
  }
  if (code && inAppBrowser) {
    showOpenAppButton(code);
  }

  orderStoreButtons(platform);
  setUpInAppBrowserNotice(inAppBrowser, platform);
}

initialize();
