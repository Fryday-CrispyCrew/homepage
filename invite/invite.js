/**
 * 그룹 초대 링크 랜딩.
 *
 * 앱이 설치돼 있으면 OS 가 App Links / Universal Links 로 이 페이지를 건너뛰고 앱을 연다.
 * 따라서 이 스크립트가 도는 상황은 둘 중 하나다.
 *   ① 앱이 없다            → 스토어로 보낸다
 *   ② 인앱 브라우저로 열렸다 → OS 가 링크를 가로채지 못했으므로 직접 열어줘야 한다.
 *                             카카오톡이면 페이지가 열리자마자 자동으로 앱을 띄운다.
 */

const INVITE_CODE_LENGTH = 6;
// 서버의 그룹명 최대 길이(FryGroup.MAX_NAME_LENGTH). 넘는 값은 손으로 조작된 링크로 보고 무시한다.
const GROUP_NAME_MAX_LENGTH = 10;
const APP_SCHEME_URL = "fryday://group/join?code=";
const AUTO_OPEN_TRIED_PARAM = "opened";
const FROM_KAKAO_PARAM = "from";

const elements = {
  titleFirstLine: document.getElementById("titleFirstLine"),
  titleSecondLine: document.getElementById("titleSecondLine"),
  codeSection: document.getElementById("codeSection"),
  codeValue: document.getElementById("codeValue"),
  copyBtn: document.getElementById("copyBtn"),
  openAppBtn: document.getElementById("openAppBtn"),
  openAppHint: document.getElementById("openAppHint"),
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

/**
 * 앱이 공유할 때 링크에 실어 보낸 그룹명. 이전 버전 앱이 만든 링크에는 없다.
 * 누구나 링크를 고쳐 쓸 수 있는 값이라 화면 표시에만 쓰고, 실제 참여는 앱이 서버 값으로 다시 확인한다.
 */
function readGroupName() {
  const raw = new URLSearchParams(window.location.search).get("name") ?? "";
  // 제어 문자와 보이지 않는 서식 문자(폭 0 공백, 글자 방향 전환 등)는 이름을 위장하는 데 쓰일 수 있어 지운다.
  const name = raw.replace(/[\p{Cc}\p{Cf}]/gu, "").replace(/\s+/g, " ").trim();

  if (!name || name.length > GROUP_NAME_MAX_LENGTH) return null;
  return name;
}

function showGroupName(name) {
  const highlighted = document.createElement("strong");
  highlighted.className = "invite__name";
  highlighted.textContent = name;

  elements.titleFirstLine.textContent = "FryDay ";
  elements.titleFirstLine.append(highlighted);
  elements.titleSecondLine.textContent = "그룹에 초대받았어요!";
  document.title = `FryDay ${name} 그룹 초대`;
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
    // 자동 실행이 실패했거나 앱이 없을 때만 이 화면에 남게 된다.
    elements.inAppNoticeText.textContent =
      "앱이 열리지 않았다면 외부 브라우저로 열어주세요";
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

function currentLandingUrlWith(param, value) {
  const url = new URL(window.location.origin + window.location.pathname + window.location.search);
  url.searchParams.set(param, value);
  return url.toString();
}

/**
 * 카카오톡 인앱 브라우저는 앱 링크를 OS 에 넘기지 않으므로, 페이지가 열리자마자 직접 앱을 띄운다.
 * Android: 패키지를 지정한 intent 로 앱을 바로 연다. 앱이 없으면 fallback 으로 이 페이지에 돌아온다.
 * iOS: 카카오 스킴으로 Safari 에 넘긴다. 이때 iOS 가 Universal Link 로 앱을 연다.
 */
function openAppFromKakao(code, platform) {
  if (platform === "android") {
    const fallbackUrl = currentLandingUrlWith(AUTO_OPEN_TRIED_PARAM, "1");
    window.location.replace(
      "intent://group/join?code=" + encodeURIComponent(code) +
      "#Intent;scheme=fryday;package=com.crispycrew.fryday;" +
      "S.browser_fallback_url=" + encodeURIComponent(fallbackUrl) + ";end",
    );
    return;
  }

  if (platform === "ios") {
    window.location.replace(
      "kakaotalk://web/openExternal?url=" +
        encodeURIComponent(currentLandingUrlWith(FROM_KAKAO_PARAM, "kakao")),
    );
  }
}

function initialize() {
  const params = new URLSearchParams(window.location.search);
  const code = readInviteCode();
  const groupName = readGroupName();
  const platform = detectPlatform();
  const inAppBrowser = detectInAppBrowser();
  // iOS 는 카카오톡에서 Safari 로 넘어온 뒤에도 앱이 안 열릴 수 있어, 그때도 수동 버튼을 남긴다.
  const cameFromKakao = params.get(FROM_KAKAO_PARAM) === "kakao";
  // Android fallback 으로 돌아온 페이지에서 또 자동 실행하면 무한 반복된다.
  const autoOpenTried = params.get(AUTO_OPEN_TRIED_PARAM) === "1";

  // 코드 없이 이름만 있는 링크로 공식 안내처럼 꾸미지 못하게, 유효한 초대일 때만 이름을 보여준다.
  if (code && groupName) {
    showGroupName(groupName);
  }
  if (code) {
    showInviteCode(code);
    elements.installHint.hidden = false;
  }
  if (code && (inAppBrowser || cameFromKakao)) {
    showOpenAppButton(code);
  }
  if (code && cameFromKakao) {
    elements.openAppHint.hidden = false;
  }

  orderStoreButtons(platform);
  setUpInAppBrowserNotice(inAppBrowser, platform);

  if (code && inAppBrowser === "kakaotalk" && !autoOpenTried) {
    openAppFromKakao(code, platform);
  }
}

initialize();
