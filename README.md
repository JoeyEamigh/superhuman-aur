# Superhuman AUR

Unofficial AUR autopublisher for the [Superhuman](https://superhuman.com) email client.

## Installation

AUR helpers:

```bash
paru -S superhuman

yay -S superhuman
```

Manual:

```bash
git clone https://aur.archlinux.org/superhuman.git
cd superhuman
makepkg -si
```

## OAuth Login

Superhuman's login page only hands sign-in back to the desktop app on macOS and Windows, so on Linux the browser stays on `https://mail.superhuman.com/~login#...` after OAuth auth. Copy that address from the browser, then either pick **Finish Sign-In from Clipboard** from the tray menu or run:

```bash
superhuman 'https://mail.superhuman.com/~login#...'
```

You can also use a UA changer extension or change the UA from browser devtools.

## Legal

This project is not affiliated with Superhuman. This project does not distribute any Superhuman code - downloads happen on end user devices.

## Credits

Inspired by [superhuman-linux](https://github.com/zicochaos/superhuman-linux) (happy to merge backwards into yours if you want).
