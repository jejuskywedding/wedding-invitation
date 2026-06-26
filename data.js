// 청첩장 정보 — 실제 결혼식 정보를 여기에 입력하세요.
// 이 파일만 수정하면 다른 부분 손댈 필요 없습니다.

window.WEDDING = {
  // 신랑
  groom: {
    name: "김성윤",
    father: "김병효",
    mother: "전은경",
    accounts: [
      { holder: "김성윤 (신랑)", bank: "하나은행", number: "670-910635-11007" },
    ],
  },

  // 신부
  bride: {
    name: "박하늘",
    father: "박신규",
    mother: "이현숙",
    accounts: [
      { holder: "박하늘 (신부)", bank: "기업은행", number: "114-158568-01-010" },
    ],
  },

  accountHideMessage: "축하하는 마음만 받겠습니다 감사합니다 😄",

  // 결혼식 일시 (KST) — 시작 / 종료
  date: "2026-09-12T11:30:00+09:00",
  endDate: "2026-09-12T15:00:00+09:00",

  // 예식장 정보
  venue: {
    name: "캠퍼트리 호텔 앤 리조트",
    hall: "1F",
    address: "제주시 해안마을서4길 100",
    lat: 33.4527195,
    lng: 126.4492399,
    transit: [
      "제주국제공항에서 차량으로 약 15분",
      "호텔 내 주차장 무료 이용 가능",
    ],
  },

  // 인사말
  greeting: `함께 있을 때 오는 행복이 더 커지고,
별것 아닌 일에도 웃음이 끊이지 않는
사람을 만났습니다.
예쁜 것을 보고 맛있는 것을 먹을 때
가장 먼저 생각나는 사람,
그 소중한 사람과 이제
평생을 함께하려 합니다.`,

  // 메인 사진 (히어로)
  mainPhoto: "photos/B_M01217.jpg",

  // 갤러리 사진들 (메인 사진 제외, 18장)
  gallery: [
    "photos/B_M00563.jpg",
    "photos/B_M00704.jpg",
    "photos/B_M00746.jpg",
    "photos/B_M00851.jpg",
    "photos/B_M00925.jpg",
    "photos/B_M00987.jpg",
    "photos/B_M01349.jpg",
    "photos/B_M01372.jpg",
    "photos/B_M01458.jpg",
    "photos/B_M01589.jpg",
    "photos/B_M01644.jpg",
    "photos/B_M01726.jpg",
    "photos/B_M02023.jpg",
    "photos/B_M02332.jpg",
    "photos/B_M02393.jpg",
    "photos/B_M02469.jpg",
    "photos/B_M02717.jpg",
    "photos/B_M02797.jpg",
  ],

  // 카카오 공유 (실제 사용 시 og:image URL 채우기)
  shareImage: "",
};
