/** Compile the Compose docs' first-screen example in a clean Android consumer outside this repository.
 * The consumer copies packages/ui-compose/ui in as a module, as /docs/compose tells readers to do.
 * Needs JDK 17+ and an Android SDK (ANDROID_HOME); Gradle downloads compileSdk and build tools.
 * Never publishes. The fixture is retained in the temp directory on failure for diagnosis.
 *
 * BASELINE MODE: measures the docs as they are on main. KINETIX_WRAP_LEGACY=1 also gives the
 * legacy fence its most charitable reading (wrapped in a @Composable function, imports hoisted);
 * KINETIX_CONTROL=1 swaps in a known-complete screen to prove the fixture itself builds.
 */
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const compose = join(root, 'packages/ui-compose');
const fixture = mkdtempSync(join(tmpdir(), 'kinetixui-compose-consumer-'));
const docs = readFileSync(join(root, 'apps/web/src/app/docs/compose/page.mdx'), 'utf8');
const setup = docs.split('## Setup')[1];
assert.ok(setup, 'Missing Setup section');
const match = setup.match(/```kotlin\n([\s\S]*?)\n```/);
assert.ok(match, 'Missing Setup kotlin example');
let screen = match[1];
if (process.env.KINETIX_WRAP_LEGACY === '1') {
  const imports = screen.split('\n').filter(line => line.startsWith('import '));
  const body = screen.split('\n').filter(line => !line.startsWith('import ')).join('\n');
  screen = `${imports.join('\n')}\nimport androidx.compose.runtime.Composable\n\n@Composable\nfun FirstScreen() {\n${body}\n}\n`;
}
// Skeleton control: a known-complete screen, so a failure above is attributable to the docs, not the fixture.
if (process.env.KINETIX_CONTROL === '1') {
  screen = `import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import com.kinetixui.ui.KinetixButton
import com.kinetixui.ui.KinetixTheme

@Composable
fun FirstScreen() {
    KinetixTheme {
        KinetixButton(onClick = {}) { Text("Get started") }
    }
}
`;
}

const write = (path, text) => {
  mkdirSync(join(fixture, path, '..'), { recursive: true });
  writeFileSync(join(fixture, path), text);
};
cpSync(join(compose, 'ui'), join(fixture, 'kinetixui-ui'), { recursive: true });
cpSync(join(compose, 'gradle'), join(fixture, 'gradle'), { recursive: true });
cpSync(join(compose, 'gradlew'), join(fixture, 'gradlew'));
write('gradle.properties', 'org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8\nandroid.useAndroidX=true\n');
write('settings.gradle.kts', `pluginManagement {
    repositories { google(); mavenCentral(); gradlePluginPortal() }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories { google(); mavenCentral() }
}
rootProject.name = "kinetixui-compose-consumer"
include(":app")
include(":kinetixui-ui")
project(":kinetixui-ui").projectDir = file("kinetixui-ui")
`);
write('build.gradle.kts', `plugins {
    id("com.android.application") version "9.4.1" apply false
    id("com.android.library") version "9.4.1" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.4.20" apply false
}
`);
write('app/build.gradle.kts', `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}
android {
    namespace = "com.example.consumer"
    compileSdk = 37
    defaultConfig {
        applicationId = "com.example.consumer"
        minSdk = 24
        targetSdk = 37
    }
    buildFeatures { compose = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlin { compilerOptions { jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17 } }
}
dependencies {
    implementation(project(":kinetixui-ui"))
    implementation(platform("androidx.compose:compose-bom:2026.09.00"))
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.11.0")
}
`);
write('app/src/main/AndroidManifest.xml', `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application android:label="Consumer">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`);
write('app/src/main/kotlin/com/example/consumer/FirstScreen.kt', `package com.example.consumer\n\n${screen}\n`);
write('app/src/main/kotlin/com/example/consumer/MainActivity.kt', `package com.example.consumer

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { FirstScreen() }
    }
}
`);
console.log(`Clean Compose consumer: ${fixture}`);
console.log(readFileSync(join(fixture, 'app/src/main/kotlin/com/example/consumer/FirstScreen.kt'), 'utf8'));
execFileSync(join(fixture, 'gradlew'), ['--no-daemon', '--stacktrace', ':app:assembleDebug'], { cwd: fixture, stdio: 'inherit' });
console.log('PASS: documented first screen compiles and assembles in a clean consumer.');
if (!process.argv.includes('--keep')) rmSync(fixture, { recursive: true });
