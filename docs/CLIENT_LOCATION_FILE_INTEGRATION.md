# 클라이언트 앱 - 지역 목록 파일 업데이트 구현 가이드

## 개요

앱 실행 시 Firebase Remote Config를 통해 최신 지역 목록(locations.xml) 파일을 자동으로 다운로드하는 기능입니다.

### 작동 방식
1. 앱 시작 시 Firebase Remote Config에서 `location_file_version` 값 확인
2. 로컬에 저장된 버전과 비교
3. 새 버전이 있으면 `location_file_url`에서 XML 다운로드
4. 로컬 저장소에 저장하고 버전 업데이트

---

## 1. Remote Config 파라미터

### 설정된 키

| 키 | 타입 | 설명 | 예시 값 |
|---|---|---|---|
| `location_file_version` | String | 현재 파일 버전 (정수) | `"1"`, `"2"`, `"3"` |
| `location_file_data_base64` | String | Base64로 인코딩된 XML 전체 내용 | `"PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPExvY2F0aW9ucz4..."` |

### 기본값 (Fallback)
Remote Config를 가져오지 못한 경우 앱에 번들된 `locations_v1.xml`을 사용합니다.

### 💡 중요: Base64 인코딩 방식
관리자 페이지에서 XML 파일을 업로드한 후 "Base64 인코딩하여 Remote Config 배포" 버튼을 클릭하면, XML 전체 내용이 Base64로 인코딩되어 `location_file_data_base64` 파라미터에 저장됩니다. 클라이언트는 이 값을 가져와서 디코딩하여 사용합니다.

---

## 2. Android (Kotlin) 구현

### 2.1 의존성 추가

`app/build.gradle.kts`:
```kotlin
dependencies {
    // Firebase Remote Config
    implementation("com.google.firebase:firebase-config-ktx:21.6.3")

    // Coroutines (비동기 작업용)
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
}
```

### 2.2 초기 번들 파일 추가

`app/src/main/assets/locations_v1.xml` 에 초기 버전 XML 파일을 복사해두세요.
- 이 파일은 최초 설치 시 또는 다운로드 실패 시 사용됩니다.

### 2.3 LocationFileManager 클래스 생성

```kotlin
package com.example.yourapp.manager

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.google.firebase.remoteconfig.FirebaseRemoteConfig
import com.google.firebase.remoteconfig.remoteConfigSettings
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

class LocationFileManager(private val context: Context) {

    private val remoteConfig: FirebaseRemoteConfig = FirebaseRemoteConfig.getInstance()
    private val prefs: SharedPreferences = context.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val TAG = "LocationFileManager"
        private const val LOCAL_VERSION_KEY = "local_location_version"
        private const val LOCATION_FILE_NAME = "locations.xml"
        private const val BUNDLED_FILE_NAME = "locations_v1.xml"

        // Remote Config 키
        private const val RC_VERSION_KEY = "location_file_version"
        private const val RC_DATA_KEY = "location_file_data_base64"
    }

    init {
        // Remote Config 설정
        val configSettings = remoteConfigSettings {
            minimumFetchIntervalInSeconds = 3600 // 1시간마다 체크
        }
        remoteConfig.setConfigSettingsAsync(configSettings)

        // 기본값 설정
        remoteConfig.setDefaultsAsync(
            mapOf(
                RC_VERSION_KEY to "1",
                RC_URL_KEY to ""
            )
        )
    }

    /**
     * 앱 시작 시 호출: Remote Config를 확인하고 필요시 업데이트
     */
    suspend fun checkForUpdates(): UpdateResult {
        return withContext(Dispatchers.IO) {
            try {
                // Remote Config fetch
                val fetchSuccess = remoteConfig.fetchAndActivate().await()
                Log.d(TAG, "Remote Config fetch success: $fetchSuccess")

                val remoteVersion = remoteConfig.getString(RC_VERSION_KEY).toIntOrNull() ?: 1
                val remoteDataBase64 = remoteConfig.getString(RC_DATA_KEY)
                val localVersion = prefs.getInt(LOCAL_VERSION_KEY, 0)

                Log.d(TAG, "Remote version: $remoteVersion, Local version: $localVersion")

                // 초기 설치 시 번들 파일 복사
                if (localVersion == 0) {
                    copyBundledFile()
                    prefs.edit().putInt(LOCAL_VERSION_KEY, 1).apply()
                    return@withContext UpdateResult.InitialSetup(1)
                }

                // 새 버전 확인
                if (remoteVersion > localVersion && remoteDataBase64.isNotEmpty()) {
                    Log.d(TAG, "New version available: $remoteVersion. Decoding Base64 data...")

                    val decodeSuccess = decodeAndSaveLocationFile(remoteDataBase64, remoteVersion)

                    if (decodeSuccess) {
                        prefs.edit().putInt(LOCAL_VERSION_KEY, remoteVersion).apply()
                        Log.d(TAG, "Update complete: v$remoteVersion")
                        return@withContext UpdateResult.Updated(remoteVersion)
                    } else {
                        Log.e(TAG, "Decode failed")
                        return@withContext UpdateResult.DownloadFailed
                    }
                }

                Log.d(TAG, "Already up to date: v$localVersion")
                return@withContext UpdateResult.UpToDate(localVersion)

            } catch (e: Exception) {
                Log.e(TAG, "Update check failed", e)
                return@withContext UpdateResult.Error(e.message ?: "Unknown error")
            }
        }
    }

    /**
     * Base64 디코딩 및 XML 저장
     */
    private fun decodeAndSaveLocationFile(base64Data: String, version: Int): Boolean {
        return try {
            // Base64 디코딩
            val decodedBytes = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT)
            val xmlContent = String(decodedBytes, Charsets.UTF_8)

            // 간단한 XML 유효성 검증
            if (!xmlContent.trim().startsWith("<")) {
                Log.e(TAG, "Invalid XML content after decoding")
                return false
            }

            // 내부 저장소에 저장
            val file = File(context.filesDir, LOCATION_FILE_NAME)
            file.writeText(xmlContent)

            Log.d(TAG, "File saved: ${file.absolutePath}, Size: ${xmlContent.length} bytes")
            return true
        } catch (e: Exception) {
            Log.e(TAG, "Decode and save failed", e)
            false
        }
    }

    /**
     * 앱 번들에서 초기 파일 복사
     */
    private fun copyBundledFile() {
        try {
            val inputStream = context.assets.open(BUNDLED_FILE_NAME)
            val outputFile = File(context.filesDir, LOCATION_FILE_NAME)

            inputStream.use { input ->
                outputFile.outputStream().use { output ->
                    input.copyTo(output)
                }
            }

            Log.d(TAG, "Bundled file copied: ${outputFile.absolutePath}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to copy bundled file", e)
        }
    }

    /**
     * 현재 저장된 XML 파일 읽기
     */
    fun getLocationFile(): File {
        val file = File(context.filesDir, LOCATION_FILE_NAME)

        // 파일이 없으면 번들에서 복사
        if (!file.exists()) {
            copyBundledFile()
            prefs.edit().putInt(LOCAL_VERSION_KEY, 1).apply()
        }

        return file
    }

    /**
     * 현재 로컬 버전 조회
     */
    fun getCurrentVersion(): Int {
        return prefs.getInt(LOCAL_VERSION_KEY, 0)
    }
}

/**
 * 업데이트 결과
 */
sealed class UpdateResult {
    data class Updated(val version: Int) : UpdateResult()
    data class UpToDate(val version: Int) : UpdateResult()
    data class InitialSetup(val version: Int) : UpdateResult()
    object DownloadFailed : UpdateResult()
    data class Error(val message: String) : UpdateResult()
}
```

### 2.4 MainActivity에서 사용

```kotlin
package com.example.yourapp

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.yourapp.manager.LocationFileManager
import com.example.yourapp.manager.UpdateResult
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private lateinit var locationFileManager: LocationFileManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        locationFileManager = LocationFileManager(this)

        // 앱 시작 시 업데이트 체크
        checkLocationFileUpdate()
    }

    private fun checkLocationFileUpdate() {
        lifecycleScope.launch {
            val result = locationFileManager.checkForUpdates()

            when (result) {
                is UpdateResult.Updated -> {
                    Toast.makeText(
                        this@MainActivity,
                        "지역 목록 업데이트 완료 (v${result.version})",
                        Toast.LENGTH_SHORT
                    ).show()
                }
                is UpdateResult.InitialSetup -> {
                    // 최초 설치
                }
                is UpdateResult.UpToDate -> {
                    // 이미 최신 버전
                }
                is UpdateResult.DownloadFailed -> {
                    Toast.makeText(
                        this@MainActivity,
                        "업데이트 다운로드 실패 (기존 버전 사용)",
                        Toast.LENGTH_SHORT
                    ).show()
                }
                is UpdateResult.Error -> {
                    // 에러 발생 (기존 버전 계속 사용)
                }
            }
        }
    }

    /**
     * 지역 목록 파일 사용 예시
     */
    private fun loadLocations() {
        val locationFile = locationFileManager.getLocationFile()
        val currentVersion = locationFileManager.getCurrentVersion()

        // XML 파싱 (기존 코드 사용)
        val locations = parseLocationsXml(locationFile)

        // UI 업데이트
        // ...
    }
}
```

---

## 3. iOS (Swift) 구현

### 3.1 의존성 추가

`Podfile`:
```ruby
pod 'Firebase/RemoteConfig'
```

또는 SPM:
```
https://github.com/firebase/firebase-ios-sdk
```

### 3.2 초기 번들 파일 추가

Xcode에서 `locations_v1.xml` 파일을 프로젝트에 추가하세요.

### 3.3 LocationFileManager 클래스 생성

```swift
import Foundation
import FirebaseRemoteConfig

class LocationFileManager {
    static let shared = LocationFileManager()

    private let remoteConfig = RemoteConfig.remoteConfig()
    private let userDefaults = UserDefaults.standard

    private let localVersionKey = "local_location_version"
    private let locationFileName = "locations.xml"
    private let bundledFileName = "locations_v1"

    // Remote Config 키
    private let rcVersionKey = "location_file_version"
    private let rcDataKey = "location_file_data_base64"

    private init() {
        // Remote Config 설정
        let settings = RemoteConfigSettings()
        settings.minimumFetchInterval = 3600 // 1시간
        remoteConfig.configSettings = settings

        // 기본값 설정
        remoteConfig.setDefaults([
            rcVersionKey: "1" as NSObject,
            rcUrlKey: "" as NSObject
        ])
    }

    /// 앱 시작 시 호출: Remote Config 확인 및 업데이트
    func checkForUpdates(completion: @escaping (UpdateResult) -> Void) {
        remoteConfig.fetch { [weak self] (status, error) in
            guard let self = self else { return }

            if status == .success {
                self.remoteConfig.activate { [weak self] (changed, error) in
                    guard let self = self else { return }
                    self.processRemoteConfig(completion: completion)
                }
            } else {
                print("❌ Remote Config fetch failed: \(error?.localizedDescription ?? "")")
                completion(.error(error?.localizedDescription ?? "Fetch failed"))
            }
        }
    }

    private func processRemoteConfig(completion: @escaping (UpdateResult) -> Void) {
        let remoteVersion = Int(remoteConfig[rcVersionKey].stringValue ?? "1") ?? 1
        let remoteDataBase64 = remoteConfig[rcDataKey].stringValue ?? ""
        let localVersion = userDefaults.integer(forKey: localVersionKey)

        print("📦 Remote version: \(remoteVersion), Local version: \(localVersion)")

        // 초기 설치
        if localVersion == 0 {
            copyBundledFile()
            userDefaults.set(1, forKey: localVersionKey)
            completion(.initialSetup(1))
            return
        }

        // 새 버전 확인
        if remoteVersion > localVersion && !remoteDataBase64.isEmpty {
            print("🔓 Decoding Base64 data for version: \(remoteVersion)")

            let success = decodeAndSaveLocationFile(base64Data: remoteDataBase64, version: remoteVersion)

            if success {
                userDefaults.set(remoteVersion, forKey: localVersionKey)
                print("✅ Update complete: v\(remoteVersion)")
                completion(.updated(remoteVersion))
            } else {
                print("❌ Decode failed")
                completion(.downloadFailed)
            }
        } else {
            print("✅ Already up to date: v\(localVersion)")
            completion(.upToDate(localVersion))
        }
    }

    private func decodeAndSaveLocationFile(base64Data: String, version: Int) -> Bool {
        // Base64 디코딩
        guard let decodedData = Data(base64Encoded: base64Data) else {
            print("❌ Base64 decode failed")
            return false
        }

        // UTF-8 문자열로 변환
        guard let xmlString = String(data: decodedData, encoding: .utf8) else {
            print("❌ UTF-8 decode failed")
            return false
        }

        // XML 유효성 간단 검증
        guard xmlString.trimmingCharacters(in: .whitespacesAndNewlines).hasPrefix("<") else {
            print("❌ Invalid XML content after decoding")
            return false
        }

        // 파일 저장
        let fileManager = FileManager.default
        let documentsPath = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let destinationURL = documentsPath.appendingPathComponent(locationFileName)

        do {
            try decodedData.write(to: destinationURL)
            print("✅ File saved: \(destinationURL.path), Size: \(decodedData.count) bytes")
            return true
        } catch {
            print("❌ Failed to save: \(error)")
            return false
        }
    }

    private func copyBundledFile() {
        guard let bundleURL = Bundle.main.url(forResource: bundledFileName, withExtension: "xml"),
              let data = try? Data(contentsOf: bundleURL) else {
            print("❌ Bundled file not found")
            return
        }

        let fileManager = FileManager.default
        let documentsPath = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let destinationURL = documentsPath.appendingPathComponent(locationFileName)

        do {
            try data.write(to: destinationURL)
            print("✅ Bundled file copied: \(destinationURL.path)")
        } catch {
            print("❌ Failed to copy bundled file: \(error)")
        }
    }

    /// 현재 저장된 XML 파일 경로
    func getLocationFileURL() -> URL? {
        let fileManager = FileManager.default
        let documentsPath = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let fileURL = documentsPath.appendingPathComponent(locationFileName)

        // 파일이 없으면 번들에서 복사
        if !fileManager.fileExists(atPath: fileURL.path) {
            copyBundledFile()
            userDefaults.set(1, forKey: localVersionKey)
        }

        return fileURL
    }

    /// 현재 로컬 버전 조회
    func getCurrentVersion() -> Int {
        return userDefaults.integer(forKey: localVersionKey)
    }
}

enum UpdateResult {
    case updated(Int)
    case upToDate(Int)
    case initialSetup(Int)
    case downloadFailed
    case error(String)
}
```

### 3.4 AppDelegate 또는 SceneDelegate에서 사용

```swift
import UIKit
import FirebaseCore

class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

        // Firebase 초기화
        FirebaseApp.configure()

        // 지역 목록 업데이트 체크
        checkLocationFileUpdate()

        return true
    }

    private func checkLocationFileUpdate() {
        LocationFileManager.shared.checkForUpdates { result in
            DispatchQueue.main.async {
                switch result {
                case .updated(let version):
                    print("✅ 지역 목록 업데이트 완료 (v\(version))")
                    // 필요시 UI 알림

                case .initialSetup(let version):
                    print("📦 초기 설치 완료 (v\(version))")

                case .upToDate(let version):
                    print("✅ 최신 버전 사용 중 (v\(version))")

                case .downloadFailed:
                    print("⚠️ 업데이트 다운로드 실패 (기존 버전 사용)")

                case .error(let message):
                    print("❌ 업데이트 체크 오류: \(message)")
                }
            }
        }
    }
}
```

---

## 4. 테스트 방법

### 4.1 초기 테스트

1. **앱 최초 설치**
   - 번들 파일(`locations_v1.xml`)이 정상 복사되는지 확인
   - 로컬 버전이 1로 설정되는지 확인

2. **로그 확인**
   ```
   Android: Logcat에서 "LocationFileManager" 태그 필터링
   iOS: Console에서 "📦", "✅", "❌" 이모지로 검색
   ```

### 4.2 업데이트 테스트

1. **새 버전 업로드**
   - https://mancool.netlify.app/location-file-manager.html 접속
   - 새 XML 파일을 버전 2로 업로드

2. **앱 재시작**
   - 앱을 완전히 종료 후 재시작
   - Remote Config fetch 및 다운로드 로그 확인
   - 로컬 버전이 2로 업데이트되는지 확인

3. **파일 내용 확인**
   ```kotlin
   // Android
   val file = File(context.filesDir, "locations.xml")
   Log.d("Test", file.readText())
   ```
   ```swift
   // iOS
   if let url = LocationFileManager.shared.getLocationFileURL(),
      let content = try? String(contentsOf: url) {
       print(content)
   }
   ```

### 4.3 에러 시나리오 테스트

1. **네트워크 오프라인**
   - 비행기 모드 활성화 후 앱 시작
   - 기존 버전으로 정상 작동하는지 확인

2. **잘못된 URL**
   - Remote Config URL을 잘못된 값으로 변경
   - 다운로드 실패 후 기존 버전 사용 확인

3. **Remote Config 가져오기 실패**
   - Firebase 프로젝트 연결 해제
   - 기본값 또는 기존 버전 사용 확인

---

## 5. 주의사항 및 권장사항

### ⚠️ 주의사항

1. **Remote Config Fetch 간격**
   - 기본 1시간 간격으로 설정됨
   - 테스트 시에는 `minimumFetchIntervalInSeconds = 0` 사용 가능
   - **프로덕션에서는 반드시 3600 이상 설정** (Firebase 할당량 보호)

2. **파일 크기**
   - 현재 XML 파일: 약 60KB
   - 모바일 데이터 사용량 고려 (WiFi 전용 옵션 검토)

3. **버전 관리**
   - 버전은 **정수**만 사용 (`1`, `2`, `3`, ...)
   - 문자열 비교가 아닌 숫자 비교 사용

4. **오프라인 대응**
   - 반드시 앱 번들에 초기 버전 포함
   - 다운로드 실패 시 기존 버전 계속 사용

### 💡 권장사항

1. **업데이트 타이밍**
   - 앱 시작 시 백그라운드에서 체크
   - 사용자 경험 방해하지 않도록 비동기 처리
   - 다운로드 중 UI 블로킹 없이 기존 데이터 사용

2. **사용자 알림**
   - 업데이트 완료 시 Toast/Snackbar로 간단히 알림
   - 실패 시에는 로그만 남기고 사용자에게 알리지 않음

3. **로깅**
   - 개발/테스트: 상세 로그 출력
   - 프로덕션: 에러만 로깅 (Firebase Crashlytics 활용)

4. **캐싱**
   - Remote Config는 자동으로 캐싱됨
   - 매 앱 시작마다 네트워크 요청하지 않음

---

## 6. FAQ

### Q1: 업데이트는 언제 적용되나요?
**A:** 앱을 완전히 종료 후 재시작할 때 체크됩니다. 백그라운드→포그라운드 전환만으로는 체크하지 않습니다.

### Q2: 사용자가 업데이트를 거부할 수 있나요?
**A:** 아니요. 자동으로 다운로드되며 사용자 선택권은 없습니다. 파일 크기가 작아 데이터 사용량 걱정이 적습니다.

### Q3: 구버전 앱은 어떻게 되나요?
**A:** 이 기능이 없는 구버전 앱은 번들된 XML 파일을 계속 사용합니다. 문제없이 작동합니다.

### Q4: 업데이트 강제는 어떻게 하나요?
**A:** Remote Config 버전 번호를 높이면 모든 앱이 자동으로 다운로드합니다. 별도 앱 업데이트 없이 즉시 적용됩니다.

### Q5: 롤백은 어떻게 하나요?
**A:** 관리 페이지에서 이전 버전을 선택하여 Remote Config를 업데이트하면 됩니다. 다음 앱 시작 시 이전 버전을 다운로드합니다.

### Q6: XML 파일이 손상되면?
**A:** 다운로드 시 간단한 유효성 검증(`<`로 시작)을 수행합니다. 실패 시 기존 버전을 계속 사용합니다.

---

## 7. 관련 문서

- [Firebase Remote Config 문서](https://firebase.google.com/docs/remote-config)
- [관리 페이지](https://mancool.netlify.app/location-file-manager.html)
- [Storage 파일 목록](https://supabase.com/dashboard/project/iwpgvdtfpwazzfeniusk/storage/buckets/location-files)

---

## 8. 문의

구현 중 문제가 발생하면 다음 정보와 함께 문의하세요:

1. 플랫폼 (Android/iOS)
2. 로그 출력 내용
3. Remote Config 값 (`location_file_version`, `location_file_url`)
4. 로컬 저장된 버전 번호
5. 네트워크 연결 상태

---

**마지막 업데이트:** 2026-01-24
**작성자:** Backend Team
