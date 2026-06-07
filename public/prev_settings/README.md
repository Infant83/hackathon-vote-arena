# prev_settings

이 폴더는 관리자 화면에서 바로 불러올 수 있는 과거/사전 행사 설정을 보관하는 곳입니다.

배포 후 파일은 `/prev_settings/...` 경로로 제공됩니다. 공개 저장소와 공개 배포에 포함되므로 실명, 내부 소속, 비공개 사진, 민감한 운영 정보를 넣기 전에 반드시 익명화 여부를 확인합니다.

## 파일 규칙

- 표준 파일명: `settings.json`
- 보관 파일명 예시: `2026_ax_q2_meeting.settings.json`
- manifest: `settings_manifest.json`

`settings_manifest.json`에 등록된 항목만 관리자 화면의 저장된 설정 목록에 나타납니다.

로컬/번들 운영 원본은 `event-configs/`에 둘 수 있습니다. 관리자 화면은 `event-configs/*.json`에서 읽은 관리자 전용 preset과 이 공개 preset 목록을 같은 드롭다운에 함께 보여줍니다. `public/prev_settings/`는 배포 산출물에 포함되는 공개 preset만 둡니다.

```json
{
  "settings": [
    {
      "id": "2026-ax-q2-meeting",
      "label": "2026 AX 그룹 2분기 모임",
      "description": "Q&A와 퀴즈 중심 운영 설정",
      "eventId": "2026-ax-q2-meeting",
      "workerName": "meeting",
      "roomName": "2026-ax-q2-meeting",
      "settingsFile": "public/prev_settings/2026_ax_q2_meeting.settings.json",
      "file": "2026_ax_q2_meeting.settings.json"
    }
  ]
}
```

각 설정 파일은 아래 구조를 권장합니다.

```json
{
  "event": {
    "id": "2026-ax-q2-meeting",
    "label": "2026 AX 그룹 2분기 모임",
    "workerName": "meeting",
    "roomName": "2026-ax-q2-meeting",
    "settingsFile": "public/prev_settings/2026_ax_q2_meeting.settings.json"
  },
  "copy": {},
  "settings": {},
  "teams": [],
  "quizzes": []
}
```

`event.roomName`은 DB를 자동으로 바꾸는 값이 아니라 해당 설정의 권장/원래 Durable Object room을 기록하는 값입니다. Cloudflare 운영에서 실제 DB room은 배포 환경의 `ARENA_ROOM_NAME`으로 결정됩니다.

기존 `team_info.json`과 `team_infos.zip` 구조는 업로드 호환용으로 계속 지원하지만, 새로 저장하거나 보관할 때는 `settings.json` 이름을 사용합니다.
