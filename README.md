# PakiVPN

Кроссплатформенный клиент VPN-сервиса: один React-интерфейс для Web, Desktop (Electron) и Android.
Статус: **прототип / в разработке** - часть функциональности из списка ниже ещё не доделана.

## Идея проекта

Вместо того чтобы писать отдельный UI для каждой платформы, интерфейс (`web/`) переиспользуется
как есть на всех трёх: в браузере, внутри Electron-приложения и внутри Android-приложения (через
WebView). Связь с системными функциями каждой платформы (запуск VPN-туннеля, права администратора,
статус соединения) идёт через единый JS-мост `NativeBridge`, который сам определяет, где выполняется
код, и переключается между `Electron IPC` и `AndroidBridge`.

Ядро VPN-туннелирования не писалось с нуля - используется проверенное открытое ядро
[sing-box](https://github.com/SagerNet/sing-box) и Android-клиент на основе
[NekoBox for Android](https://github.com/MatsuriDayo/NekoBoxForAndroid) (GPL-3.0). Поверх этого
построены: свой backend API, оплата, кроссплатформенный UI и десктоп-клиент.

## Структура репозитория

```
├── web/         React + TypeScript - общий UI (страницы авторизации, выбора локации, статуса VPN)
├── electron/     Desktop-клиент (Windows/macOS/Linux)
│   └── src/
│       ├── app/       - главный процесс Electron, окно, IPC
│       ├── service/    - фоновый сервис, управляющий sing-box (может работать с правами администратора)
│       └── libs/       - обвязка: TCP/IPC между процессами, проверка прав администратора, аргументы CLI
├── android/      Android-клиент на базе NekoBox for Android (sing-box ядро), переименован в PakiVPN
└── gulp-scripts/ Сборочные скрипты (build:web, build:android, build:electron, start:electron)
```

## Технологии

- **Frontend:** React 19, TypeScript, Ant Design, styled-components
- **Desktop:** Electron, Electron Forge, Node.js (net/TCP для IPC между процессами), electron-store
- **Android:** Kotlin/Java, sing-box (VLESS/Trojan/Shadowsocks/WireGuard и др.), на основе NB4A
- **Инфраструктура:** собственный backend API, VLESS + TLS для туннелирования

## Что уже работает

- Общий UI для трёх платформ через единый `NativeBridge`
- Electron: запуск/остановка VPN-сервиса, работа фонового процесса с правами администратора,
  автообновление (`update-electron-app`)
- Android: полноценное ядро sing-box (унаследовано от NekoBox for Android)
- Клиентский API (`ApiClient`) для получения списка локаций, статуса пользователя, генерации конфигурации

## Что в процессе / TODO

- [ ] Полная синхронизация статусов между Electron-сервисом и UI
- [ ] Вынести захардкоженные конфигурации сервера в переменные окружения
- [ ] Покрытие тестами
- [ ] Публикация сборок (Android APK, десктоп-инсталляторы)

## Локальный запуск

```bash
# Web UI (тестирование интерфейса в браузере)
cd web && npm install && npm start

# Desktop (Electron)
npm install
npm run electron:start

# Android
# см. android/README.md - сборка через Gradle
```

## Лицензия

Каталог `android/` основан на NekoBox for Android и распространяется по лицензии **GPL-3.0**
(см. `android/LICENSE`). Остальной код (`web/`, `electron/`) - собственная разработка.
