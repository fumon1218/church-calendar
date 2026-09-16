# 교회 일정표 (Church Calendar)

모바일과 데스크톱 모두에 최적화된 주간 및 월간 교회 일정 관리 애플리케이션입니다.

## 🚀 빠른 시작 가이드 (Local Run)

컴퓨터에서 실행하려면 Node.js가 설치되어 있어야 합니다.

1. **저장소 클론(Clone)**
   ```bash
   git clone https://github.com/사용자아이디/저장소이름.git
   cd 저장소이름
   ```

2. **패키지 설치**
   ```bash
   npm install
   ```

3. **개발 서버 실행**
   ```bash
   npm run dev
   ```
   브라우저에서 `http://localhost:3000`으로 접속합니다.

4. **프로덕션 빌드**
   ```bash
   npm run build
   ```

## 🌐 GitHub Pages 자동 배포
이 저장소에는 GitHub Actions를 통한 자동 배포 워크플로우(`.github/workflows/deploy.yml`)가 포함되어 있습니다.
- GitHub 저장소의 **Settings > Pages**에서 **Source**를 **GitHub Actions**로 설정하면 자동으로 배포됩니다.
