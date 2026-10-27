const DESCRIPTIONS_BY_NAME: Record<string, string> = {
  'Mousse chanh dây': 'Lớp mousse mịn màng hòa quyện cùng vị chua dịu thanh mát từ chanh dây tươi, trên nền cốt bánh mềm ẩm nhẹ nhàng.',
  'Mousse dâu tươi': 'Vị chua ngọt tự nhiên của dâu tây tươi kết hợp cùng lớp kem mousse béo nhẹ, thanh tao và thơm mát.',
  'Mousse matcha phô mai': 'Sự kết hợp tinh tế giữa bột matcha thơm thanh và vị phô mai béo ngậy êm dịu, ít ngọt và thơm lắng sâu.',
  'Mousse chocolate đen': 'Vị chocolate đen nguyên chất đậm đà, đắng nhẹ quyến rũ hòa quyện cùng lớp kem mềm mượt như tan ngay nơi đầu lưỡi.',
  'Mousse việt quất': 'Màu sắc tự nhiên từ những quả việt quất mọng nước, mang vị chua ngọt dịu mát trên nền cốt bánh bông xốp.',
  'Tiramisu classic coffee': 'Hương cà phê đậm đà kết hợp cùng lớp kem mascarpone béo ngậy truyền thống và chút đắng nhẹ của bột cacao.',
  'Tiramisu cacao': 'Lớp kem mascarpone mềm mịn quyện cùng hương vị cacao thơm nồng nàn, ngọt dịu và đượm vị ấm áp.',
  'Tiramisu matcha': 'Làn gió mới cho món tiramisu cổ điển với vị matcha thanh mát, xen kẽ từng lớp kem béo nhẹ không hề ngấy.',
  'Tiramisu dâu': 'Vị dâu ngọt ngào tươi tắn hòa cùng kem mascarpone béo ngậy, mang lại cảm giác tươi mới, dịu dàng.',
  'Tiramisu oreo': 'Sự kết hợp giòn thơm của vụn bánh oreo cùng lớp kem tiramisu mịn màng, chiều chuộng vị giác của mọi lứa tuổi.',
  'Bông lan trứng muối basic': 'Cốt bánh bông lan xốp mềm, thơm lừng hương bơ sữa kết hợp cùng vị bùi béo đậm đà của trứng muối nướng chín tới.',
  'Bông lan trứng muối phô mai': 'Bông lan mềm tan điểm thêm lớp phô mai béo ngậy tan chảy cùng trứng muối bùi bùi, mặn ngọt hài hòa.',
  'Bông lan trứng muối sốt dầu trứng': 'Sốt dầu trứng trong veo, béo ngậy tự làm phủ đều trên cốt bánh mềm xốp cùng chà bông và trứng muối thơm lừng.',
  'Bông lan bơ sữa trái cây': 'Cốt bánh bơ sữa bông xốp dịu nhẹ, điểm xuyết trái cây tươi giòn ngọt cho cảm giác thanh mát, tròn vị.',
  'Bông lan bơ sữa chocolate chips': 'Từng viên chocolate chip giòn tan ẩn mình trong thớ bánh bông lan bơ sữa thơm mềm, ngọt ngào vừa vặn.',
  'Bánh kem vanilla trái cây': 'Hương vanilla tự nhiên thơm dịu cùng kem tươi thanh nhẹ, phủ đầy trái cây tươi theo mùa ngọt lành.',
  'Bánh kem chocolate': 'Cốt bánh chiffon chocolate ẩm mềm phủ lớp ganache chocolate đậm đà, thơm béo mà không hề ngấy.',
  'Bánh kem red velvet': 'Sắc đỏ nhung quyến rũ với cốt bánh ẩm xốp, kết hợp hoàn hảo cùng lớp kem cheese chua nhẹ béo ngậy.',
  'Bánh kem oreo': 'Lớp kem tươi trộn vụn bánh oreo thơm giòn xen giữa các tầng bánh mềm ẩm, ngọt ngào và cuốn hút.',
  'Bánh kem tiramisu kem': 'Hương vị tiramisu tinh tế được tạo hình thành chiếc bánh kem trang nhã, ngọt dịu và đậm đà khó quên.',
}

const CATEGORY_FALLBACKS: Record<string, string> = {
  'Bánh kem': 'Những mẻ bánh kem tươi mềm mại, vị ngọt thanh nhẹ nhàng làm thủ công từ căn bếp nhỏ Leaf Creme.',
  'Bông lan': 'Cốt bánh bông lan mềm mại xốp mịn, nướng mới mỗi ngày với hương thơm dịu nhẹ.',
  'Mousse': 'Lớp kem mousse mịn mượt, thanh mát và tan ngay nơi đầu lưỡi cho những phút giây thư thái.',
  'Tiramisu': 'Hương vị tiramisu cổ điển mềm ngậy với lớp kem tươi mascarpone tinh tế.',
}

export function getProductDescription(name: string, originalDescription?: string | null, category?: string | null): string {
  const cleanDesc = originalDescription?.trim() || ''
  const cleanName = name.trim().toLowerCase()

  // If original description is just repeating the name or empty (e.g. "Bánh kem oreo." or "Mousse vị việt quất.")
  const isTautology = !cleanDesc || 
    cleanDesc.toLowerCase() === cleanName || 
    cleanDesc.toLowerCase() === `${cleanName}.` ||
    cleanDesc.toLowerCase() === `${cleanName} kem.` ||
    cleanDesc.toLowerCase().startsWith(`${cleanName}.`)

  if (!isTautology && cleanDesc.length > cleanName.length + 15) {
    return cleanDesc
  }

  // Lookup curated poetic sensory description
  if (DESCRIPTIONS_BY_NAME[name]) {
    return DESCRIPTIONS_BY_NAME[name]
  }

  // Fallback by category
  if (category && CATEGORY_FALLBACKS[category]) {
    return CATEGORY_FALLBACKS[category]
  }

  return 'Những chiếc bánh ngọt ngào được làm thủ công mỗi ngày bằng cả sự tỉ mỉ từ căn bếp Leaf Creme.'
}
