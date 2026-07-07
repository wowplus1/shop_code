// 편의점 및 마트 주요 생필품 10종의 가상 바코드-상품명 매핑 및 온라인 최저가 Mock 데이터
export const mockProducts = {
  "8801043014798": {
    barcode: "8801043014798",
    name: "농심 신라면 120g x 5입",
    image: "https://images.unsplash.com/photo-1613946069912-87a66a96c44b?auto=format&fit=crop&q=80&w=400",
    lowPrice: 3850,
    shippingFee: 3000,
    mallName: "네이버 쇼핑몰",
    link: "https://search.shopping.naver.com/search/all?query=농심+신라면+5입"
  },
  "8801007112508": {
    barcode: "8801007112508",
    name: "CJ 햇반 210g x 12개입",
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400",
    lowPrice: 11400,
    shippingFee: 0,
    mallName: "CJ더마켓",
    link: "https://search.shopping.naver.com/search/all?query=CJ+햇반+210g+12개"
  },
  "8801089201015": {
    barcode: "8801089201015",
    name: "제주삼다수 2L x 6개입",
    image: "https://images.unsplash.com/photo-1548839134-24a5cc3943ed?auto=format&fit=crop&q=80&w=400",
    lowPrice: 5900,
    shippingFee: 0,
    mallName: "삼다수몰",
    link: "https://search.shopping.naver.com/search/all?query=제주삼다수+2L+6개"
  },
  "8801045291234": {
    barcode: "8801045291234",
    name: "오뚜기 맛있는 오뚜기밥 210g",
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400",
    lowPrice: 980,
    shippingFee: 2500,
    mallName: "오뚜기몰",
    link: "https://search.shopping.naver.com/search/all?query=오뚜기밥+210g"
  },
  "8801056020021": {
    barcode: "8801056020021",
    name: "롯데칠성 펩시콜라 제로슈거 라임 355ml x 24캔",
    image: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&q=80&w=400",
    lowPrice: 14900,
    shippingFee: 2500,
    mallName: "롯데온",
    link: "https://search.shopping.naver.com/search/all?query=펩시+제로슈거+라임+355ml"
  },
  "8801115111032": {
    barcode: "8801115111032",
    name: "서울우유 나100% 1L",
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=400",
    lowPrice: 2850,
    shippingFee: 3000,
    mallName: "서울우유 공식몰",
    link: "https://search.shopping.naver.com/search/all?query=서울우유+나100+1L"
  },
  "8801068097561": {
    barcode: "8801068097561",
    name: "SPC 삼립 호이호이 꿀호떡 200g",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400",
    lowPrice: 1350,
    shippingFee: 2500,
    mallName: "삼립공식몰",
    link: "https://search.shopping.naver.com/search/all?query=삼립+꿀호떡"
  },
  "8801007018312": {
    barcode: "8801007018312",
    name: "백설 하얀설탕 1kg",
    image: "https://images.unsplash.com/photo-1581781898089-9118c11f7cbf?auto=format&fit=crop&q=80&w=400",
    lowPrice: 1980,
    shippingFee: 3000,
    mallName: "CJ더마켓",
    link: "https://search.shopping.naver.com/search/all?query=백설+하얀설탕+1kg"
  },
  "8801043015849": {
    barcode: "8801043015849",
    name: "농심 짜파게티 140g x 5입",
    image: "https://images.unsplash.com/photo-1613946069912-87a66a96c44b?auto=format&fit=crop&q=80&w=400",
    lowPrice: 4200,
    shippingFee: 3000,
    mallName: "네이버 쇼핑몰",
    link: "https://search.shopping.naver.com/search/all?query=농심+짜파게티+5입"
  },
  "8801104230102": {
    barcode: "8801104230102",
    name: "빙그레 바나나맛우유 240ml x 4개입",
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=400",
    lowPrice: 5800,
    shippingFee: 3000,
    mallName: "빙그레 공식몰",
    link: "https://search.shopping.naver.com/search/all?query=빙그레+바나나맛우유+4개"
  }
};

// 바코드가 DB에 없을 때 가상의 유사 상품명을 찾거나 또는 API 호출 결과를 가공하기 위한 헬퍼 함수
export const findMockProduct = (barcode) => {
  return mockProducts[barcode] || null;
};
