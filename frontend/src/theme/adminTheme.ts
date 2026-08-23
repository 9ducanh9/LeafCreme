import { createTheme } from '@mui/material/styles'

/**
 * Admin dashboard theme — "Soft Craft" palette (sand/terra/mint).
 *
 * Nguồn màu thật nằm ở frontend/src/styles/tokens.css (dùng cho storefront).
 * MUI's theme object cần giá trị JS thuần, không dùng được CSS custom
 * property trực tiếp, nên bảng dưới đây là bản chép tay đồng bộ với
 * tokens.css. Nếu tokens.css đổi, sửa lại ở đây theo — chưa có bước tự
 * đồng bộ (cần một script nhỏ đọc tokens.css lúc build; chưa đáng làm cho
 * tới khi bảng màu cần đổi nhiều hơn một lần).
 *
 * Áp dụng: bọc quanh <AdminLayout /> (layout/admin/AdminLayout.tsx) — chỉ
 * ảnh hưởng nhánh /admin/*, không đụng tới theme mặc định của storefront.
 */
export const sand = {
  50: '#FFFBF5', 100: '#FBF4EA', 200: '#F2E8DA', 300: '#E3D5C2', 400: '#C4B29B',
  500: '#9D8770', 600: '#7A6A56', 700: '#5A4C3C', 800: '#3A2E24', 900: '#241B14',
}
export const terra = {
  50: '#FDF3EC', 100: '#FAE3D4', 200: '#F5CDB2', 300: '#EFB894', 400: '#E08B54',
  500: '#D97742', 600: '#C2410C', 700: '#9A3412', 800: '#7C2D12',
}
const mint = { 50: '#EFFAF7', 100: '#D6F2EC', 300: '#5EC7BA', 500: '#14897C', 600: '#0F766E', 700: '#115E59' }
const green = { 50: '#F0FDF4', 600: '#15803D' }
const amber = { 50: '#FFFBEB', 600: '#B45309' }
const red = { 50: '#FEF2F2', 600: '#B91C1C' }
const blue = { 50: '#EFF6FF', 600: '#1D4ED8' }

export const adminTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: terra[600], light: terra[400], dark: terra[700], contrastText: '#FFFFFF' },
    secondary: { main: mint[600], light: mint[300], dark: mint[700], contrastText: '#FFFFFF' },
    error: { main: red[600], light: red[50] },
    warning: { main: amber[600], light: amber[50] },
    success: { main: green[600], light: green[50] },
    info: { main: blue[600], light: blue[50] },
    background: { default: sand[50], paper: '#FFFFFF' },
    text: { primary: sand[800], secondary: sand[600], disabled: sand[400] },
    divider: sand[200],
    // Nhiều component cũ (bảng, form, filter) trước đây tô màu trung tính
    // bằng hex/rgba viết tay (#F7F6F3, #E8E5DD, rgba(122,111,99,*)...) rải
    // rác khắp nơi. Map thang "grey" chuẩn của MUI sang đúng thang sand này
    // để mọi chỗ chỉ cần viết `grey.50`/`grey.200`/... và tự động đồng bộ
    // với theme — không còn hex rời rạc nào phải nhớ lại nữa.
    grey: { 50: sand[50], 100: sand[100], 200: sand[200], 300: sand[300], 400: sand[400], 500: sand[500], 600: sand[600], 700: sand[700], 800: sand[800], 900: sand[900] },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: "'Inter Variable', 'Inter', 'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
    h4: { fontFamily: "'Bricolage Grotesque Variable', 'Be Vietnam Pro', system-ui, sans-serif", fontWeight: 700, color: sand[900] },
    h5: { fontFamily: "'Bricolage Grotesque Variable', 'Be Vietnam Pro', system-ui, sans-serif", fontWeight: 700, color: sand[900] },
    h6: { fontWeight: 600, color: sand[900] },
    button: { textTransform: 'none' as const },
  },
  components: {
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiAppBar: { styleOverrides: { root: { backgroundColor: '#FFFFFF', color: sand[800], boxShadow: `0 1px 3px rgba(58,46,36,0.08)` } } },
    MuiDrawer: { styleOverrides: { paper: { backgroundColor: '#FFFFFF', borderRight: `1px solid ${sand[200]}` } } },
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 600, color: sand[600], backgroundColor: sand[50] } } },
    MuiTableRow: { styleOverrides: { root: { '&:hover': { backgroundColor: sand[50] } } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10 } } },
    // `<TextField select>` không có minWidth riêng thì co lại vừa khít nhãn
    // đã floated — với nhãn tiếng Việt có dấu (vd. "Trạng thái"), nó co tới
    // mức nhãn bị cắt còn "Tr." Đặt một chỗ ở đây thay vì tự thêm sx={{minWidth}}
    // vào từng bộ lọc rải rác khắp các trang.
    MuiSelect: { styleOverrides: { select: { minWidth: 96 } } },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': { backgroundColor: terra[50], color: terra[700] },
          '&.Mui-selected:hover': { backgroundColor: terra[100] },
          '&.Mui-selected .MuiListItemIcon-root': { color: terra[600] },
        },
      },
    },
    // Focus ring rõ ràng trên MỌI thứ dựng từ ButtonBase (Button, IconButton,
    // Tab, MenuItem, ListItemButton, Checkbox, Radio, Switch...) — một chỗ
    // duy nhất thay vì tự thêm outline ở từng component. terra-600 đạt
    // 5.02:1 / 3.32:1 với canvas (verify: docs/contrast-check.py) nên đủ rõ
    // trên cả hai màu nền hay dùng nhất trong admin.
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible': { outline: `2px solid ${terra[600]}`, outlineOffset: 2 },
        },
      },
    },
  },
})
