const townships = {
  "Ayeyarwady": {
    "Bogale": ["Bogale"],
    "Danubyu": ["Danubyu"],
    "Dedaye": ["Dedaye"],
    "Hinthada": ["Batye", "Hinthada", "Htoogyi", "Ingapu", "Kyangin", "Lemyethna", "Myanaung", "Zalun"],
    "Labutta": ["Labutta", "Lubutta (3) Mile", "Mawlamyinegyun", "Pyinsalu"],
    "Maubin": ["Maubin", "Nyaungdon", "Pantanaw"],
    "Myaungmya": ["Einme", "Myaungmya", "Wakema"],
    "Pathein": ["Ahtaung", "Kangyidaunt", "Kyaunggon", "Kyonpyaw", "Ngapudaw", "Pathein", "Thabaung", "Yegyi"],
    "Pyapon": ["Kyaiklat", "Pyapon"]
  },
  "Bago": {
    "Bago": ["Bago", "Daik-U", "Kawa", "Kyauktaga", "Nyaunglebin", "Shwegyin", "Thanatpin", "Waw"],
    "Pyay": ["Padaung", "Paukkhaung", "Paungde", "Pyay", "Shwedaung", "Thegon"],
    "Taungoo": ["Htantabin", "Kyaukkyi", "Oktwin", "Phyu", "Taungoo", "Yedashe"],
    "Thayarwady": ["Gyobingauk", "Letpadan", "Minhla", "Monyo", "Nattalin", "Okpho", "Thayarwady", "Zigon"]
  },
  "Chin": {
    "Falam": ["Falam", "Tedim", "Tonzang"],
    "Hakha": ["Hakha", "Thantlang"],
    "Mindat": ["Kanpetlet", "Matupi", "Mindat", "Paletwa"]
  },
  "Kachin": {
    "Bhamo": ["Bhamo", "Mansi", "Momauk", "Shwegu"],
    "Mohnyin": ["Hpakant", "Mogaung", "Mohnyin"],
    "Myitkyina": ["Chipwi", "Injangyang", "Myitkyina", "Tanai", "Tsawlaw", "Waingmaw"],
    "Puta-O": ["Khaunglanhpu", "Machanbaw", "Nawngmun", "Puta-O", "Sumprabum"]
  },
  "Kayah": {
    "Bawlake": ["Bawlake", "Hpasawng", "Mese"],
    "Loikaw": ["Demoso", "Hpruso", "Loikaw", "Shadaw"]
  },
  "Kayin": {
    "Hpa-An": ["Hlaingbwe", "Hpa-An", "Thandaunggyi"],
    "Hpapun": ["Hpapun"],
    "Kawkareik": ["Kawkareik", "Kyainseikgyi"],
    "Myawaddy": ["Myawaddy"]
  },
  "Magway": {
    "Gangaw": ["Gangaw", "Saw", "Tilin"],
    "Magway": ["Chauk", "Magway", "Myothit", "Natmauk", "Taungdwingyi", "Yenangyaung"],
    "Minbu": ["Minbu", "Ngape", "Pwintbyu", "Salin", "Sidoktaya"],
    "Pakokku": ["Myaing", "Pakokku", "Pauk", "Seikphyu", "Yesagyo"],
    "Thayet": ["Aunglan", "Kamma", "Mindon", "Minhla", "Sinbaungwe", "Thayet"]
  },
  "Mandalay": {
    "Kyaukse": ["Kyaukse", "Myittha", "Sintgaing", "Tada-U"],
    "Mandalay": ["Amarapura", "Aungmyaythazan", "Chanayethazan", "Chanmyathazi", "Mahaaungmyay", "Patheingyi", "Pyigyitagon"],
    "Meiktila": ["Mahlaing", "Meiktila", "Thazi", "Wundwin"],
    "Myingyan": ["Myingyan", "Natogyi", "Ngazun", "Taungtha"],
    "Nyaung-U": ["Kyaukpadaung", "Nyaung-U"],
    "Pyinoolwin": ["Madaya", "Mogoke", "Pyinoolwin", "Singu", "Thabeikkyin"],
    "Yamethin": ["Pyawbwe", "Yamethin"]
  },
  "Mon": {
    "Mawlamyine": ["Chaungzon", "Kyaik Mayaw", "Mawlamyine", "Mudon", "Thanbyuzayat", "Ye"],
    "Thaton": ["Bee Lin", "Kyaik Hto", "Paung", "Thaton"]
  },
  "Naypyidaw": {
    "Det Khi Na": ["Det Khi Na Thi Ri", "Lewe", "Pyinmana", "Za Bu Thi Ri"],
    "Oke Ta Ra": ["Oke Ta Ra Thi Ri", "Poke Ba Thi Ri", "Tatkon", "Zay Yar Thi Ri"]
  },
  "Rakhine": {
    "Kayuk Phyu": ["Ann", "Kayuk Phyu", "Marn Aung", "Yan Byae"],
    "Maungtaw": ["Butheetaung", "Maungtaw"],
    "Mrauk-U": ["Kyauktaw", "Minn Pyar", "Mrauk-U", "Myay Pon"],
    "Sittwe": ["Pauktaw", "Ponnagyun", "Rathedaung", "Sittwe"],
    "Thandwe": ["Gwa", "Taung Kote", "Thandwe"]
  },
  "Sagaing": {
    "Hkamti": ["Hkamti", "Homalin", "Lahe", "Lay Shi", "Nanyun"],
    "Kale": ["Kale", "Kalewa", "Mingin"],
    "Kanbalu": ["Kanbalu", "Kyunhla"],
    "Katha": ["Banmauk", "Indaw", "Katha", "Kawlin", "Pinlebu", "Tigyaing", "Wuntho"],
    "Mawlaik": ["Mawlaik", "Paungbyin"],
    "Monywa": ["Ayadaw", "Budalin", "Chaung-U", "Monywa"],
    "Sagaing": ["Myaung", "Myinmu", "Sagaing"],
    "Shwebo": ["Khin-U", "Shwebo", "Tabayin", "Taze", "Wetlet", "Ye-U"],
    "Tamu": ["Tamu"],
    "Yinmarbin": ["Kani", "Pale", "Salingyi", "Yinmarbin"]
  },
  "Shan": {
    "Hopang": ["Mongmao", "Pangwaun"],
    "Kyaington": ["Kyaington", "Mong Khat", "Mong Lar", "Mong Pyinn", "Mong Yang"],
    "Kyaukme": ["Namhsan", "Namtu", "Naung Cho"],
    "Langkhay": ["Langkhay", "Mawkmai", "Mongnai", "Mongpan"],
    "Lashio": ["Tangyan"],
    "Laukkaing": ["Konkyan", "Laukkaing"],
    "Loilen": ["Kunhing", "Kyethi", "Laecharr", "Loilen", "Monghsu", "Mongkaing", "Nansang"],
    "Matman": ["Matman", "Narphan", "Pangsang"],
    "Mong Maw (Wa SAD)": ["Aik Chan (Ai' Chun)", "Hkun Mar (Hkwin Ma)", "Hsawng Hpa (Saun Pha)", "Ka Lawng Hpar", "Kawng Min Hsang", "Lin Haw", "Long Htan", "Man Tun", "Nam Tit", "Nar Wee (Na Wi)", "Yawng Lin", "Yin Pang"],
    "Mong Pawk (Wa SAD)": ["Ho Tawng (Ho Tao)", "Mong Hpen", "Mong Kar", "Mong Pawk", "Nam Hpai"],
    "Mongh Set": ["Mongh Set", "Mongton"],
    "Mongmit": ["Ma Baine", "Mongmit"],
    "Muse": ["Kutkai", "Muse", "Namhkan"],
    "Tarchileik": ["Mong Yawng", "Mongh Pyak", "Tarchileik"],
    "Taunggyi": ["Hopong", "Hsihseng", "Kalaw", "Lawksawk", "Nyaung Shwe", "Phal Khone", "Pinlaung", "Pinntaya", "Taunggyi", "Ywar Ngan"],
    "Wein Kawng (Wein Kao) (Wa SAD)": ["Man Man Hseng", "Nam Hkam Wu", "Nar Kawng", "Nawng Hkit", "Pang Hkam", "Pang Yang"]
  },
  "Tanintharyi": {
    "Dawei": ["Dawei", "Launglon", "Thayetchaung", "Yebyu"],
    "Kawthoung": ["Bokpyin", "Kawthoung"],
    "Myeik": ["Kyunsu", "Myeik", "Palaw", "Tanintharyi"]
  },
  "Yangon": {
    "Yangon (East)": ["Botahtaung", "Dagon Myothit (East)", "Dagon Myothit (North)", "Dagon Myothit (Seikkan)", "Dagon Myothit (South)", "Dawbon", "North Okkalapa", "Pazundaung", "South Okkalapa", "Tamwe", "Thaketa", "Thingangyun", "Yankin"],
    "Yangon (North)": ["Hlaingtharya", "Hlegu", "Hmawbi", "Htantabin", "Insein", "Mingaladon", "Mingalartaungnyunt", "Shwepyithar", "Taikkyi"],
    "Yangon (South)": ["Dala", "Kawhmu", "Khayan", "Kokoe Kyunn", "Kungyangon", "Kyauktada", "Kyauktan", "Seikgyikanaungto", "Thanlyin", "Thongwa", "Twantay"],
    "Yangon (West)": ["Ahlone", "Bahan", "Dagon", "Hlaing", "Kamaryut", "Kyeemyindaing", "Lanmadaw", "Latha", "Mayangone", "Pabedan", "Sanchaung", "Seikkan"]
  }
};

export default townships;

export const REGION_NAMES = Object.keys(townships);
export function getDistricts(region) {
  return region ? Object.keys(townships[region] || {}) : [];
}
export function getTownships(region, district) {
  if (!region || !district) return [];
  return townships[region]?.[district] || [];
}
