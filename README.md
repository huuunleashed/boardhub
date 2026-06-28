# BoardHub

San choi board game mien phi cho nguoi Viet. BoardHub la mot nen tang tu host:
tai khoan, sanh choi, ban choi thoi gian thuc, tro chuyen va ho so nguoi choi,
cong them mot bo SDK game de them tro choi moi theo thoi gian.

Hai game ra mat: **Oxono** (co tru tuong 2 nguoi) va **Collect** (game the bai gom
bo dong vat, 2 toi 6 nguoi).

## Tinh nang

- Choi truc tuyen thoi gian thuc qua LAN hoac Tailscale, khong can dich vu dam may.
- Choi chung ban (hotseat) tren cung mot may, hoac them bot de lap cho.
- Sanh choi voi ma vao ban, ban rieng tu, danh sach ban dang mo.
- Ho so nguoi choi, thong ke, lich su tran dau.
- Giao dien toi gian, phang, khong gradient, than thien voi ca PC va dien thoai.
- Tu host hoan toan, du lieu luu tren dia, khong phu thuoc ben thu ba.

## Tech stack

- Monorepo **pnpm workspaces**, **TypeScript**, ESM.
- `packages/shared`: kieu du lieu giao thuc, hang so, tien ich thuan.
- `packages/engine`: SDK game cong Oxono va Collect, co kiem thu **Vitest**.
- `apps/server`: **Fastify 5** REST cong **Socket.IO**, host game co quyen quyet dinh.
- `apps/web`: **React 18** + **Vite** + **React Bootstrap** + **Bootstrap 5**. Khong dung Tailwind.

## Cau truc thu muc

```
boardhub/
  apps/
    server/   Fastify + Socket.IO, quan ly ban va host game
    web/      React + Vite + Bootstrap
  packages/
    shared/   Giao thuc va kieu du lieu dung chung
    engine/   SDK game + Oxono + Collect + kiem thu
```

## Bat dau nhanh

Yeu cau: Node 20+ va pnpm 11+.

```bash
pnpm install
pnpm dev
```

- Web chay tai `http://localhost:5173`
- Server chay tai `http://localhost:4000`

Mo trinh duyet vao dia chi web, tao tai khoan hoac choi voi tu cach khach, roi tao ban.

## Choi chung qua mang LAN hoac Tailscale

1. Chay `pnpm dev` tren may chu.
2. Tim dia chi IP cua may chu (vi du IP Tailscale `100.x.y.z` hoac IP LAN `192.168.x.y`).
3. Tren may hoac dien thoai khac, mo `http://<IP-may-chu>:5173`.
4. Chia se ma ban gom bon ky tu de ban be vao thang ban cua ban.

Xem trang **Ket noi** trong ung dung de co huong dan chi tiet.

## Scripts

| Lenh | Tac dung |
| --- | --- |
| `pnpm dev` | Chay server va web song song |
| `pnpm build` | Build toan bo workspace |
| `pnpm test` | Chay kiem thu engine |
| `pnpm typecheck` | Kiem tra kieu toan bo |

## Them game moi

Moi game la mot `GameDefinition` trong `packages/engine`. Hien thuc cac ham `setup`,
`validate`, `reduce`, `view`, `getResult`, dang ky vao `registry.ts`, roi them giao
dien ban choi tuong ung trong `apps/web`. Xem Oxono va Collect lam mau.

## Giay phep

MIT. Xem [LICENSE](LICENSE).
