plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("maven-publish")
    id("signing")
}

android {
    namespace = "com.kinetixui.ui"
    compileSdk = 34

    defaultConfig {
        minSdk = 24
    }

    buildFeatures {
        compose = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    // AGP 8's built-in way to expose the release variant as a maven-publish
    // component (`components["release"]` below) without a manual variant config.
    // Central requires a sources jar *and* a javadoc jar alongside the AAR.
    publishing {
        singleVariant("release") {
            withSourcesJar()
            withJavadocJar()
        }
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.06.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")
}

// ---------------------------------------------------------------------------
// Publishing — Maven Central via the Central Portal's OSSRH-compatible
// staging API. `gradle :ui:publishToMavenLocal` still works with zero setup
// (writes an unsigned artifact to ~/.m2). A real upload reads four values,
// as Gradle -P properties or the matching env vars, all injected by
// .github/workflows/publish-compose.yml from repo secrets — nothing
// sensitive is committed here:
//
//   mavenCentralUsername       / MAVEN_CENTRAL_USERNAME     Portal user token
//   mavenCentralPassword       / MAVEN_CENTRAL_PASSWORD     Portal token password
//   signingInMemoryKey         / SIGNING_KEY                ASCII-armored GPG key
//   signingInMemoryKeyPassword / SIGNING_KEY_PASSWORD       its passphrase
//
// The upload lands a *deployment* in the Portal; releasing it to Central is
// a manual step at https://central.sonatype.com — deliberately not
// automated, the same "own your credentials, own the button" stance as the
// Flutter and SwiftUI publish workflows.
// ---------------------------------------------------------------------------
val centralUsername = providers.gradleProperty("mavenCentralUsername")
    .orElse(providers.environmentVariable("MAVEN_CENTRAL_USERNAME"))
    .map(String::trim).filter(String::isNotEmpty)
val centralPassword = providers.gradleProperty("mavenCentralPassword")
    .orElse(providers.environmentVariable("MAVEN_CENTRAL_PASSWORD"))
    .map(String::trim).filter(String::isNotEmpty)
val signingKey = providers.gradleProperty("signingInMemoryKey")
    .orElse(providers.environmentVariable("SIGNING_KEY"))
    .map(String::trim).filter(String::isNotEmpty)
val signingKeyPassword = providers.gradleProperty("signingInMemoryKeyPassword")
    .orElse(providers.environmentVariable("SIGNING_KEY_PASSWORD"))

publishing {
    publications {
        register<MavenPublication>("release") {
            groupId = "com.kinetixui"
            artifactId = "ui-compose"
            version = providers.gradleProperty("VERSION_NAME")
                .orElse(providers.environmentVariable("VERSION_NAME"))
                .getOrElse("0.1.0")

            afterEvaluate {
                from(components["release"])
            }

            pom {
                name.set("KinetixUI for Jetpack Compose")
                description.set(
                    "The Jetpack Compose port of KinetixUI — Kinetix* composables " +
                        "on the shared design-token contract.",
                )
                url.set("https://github.com/ziadfteha/kinetixui")
                licenses {
                    license {
                        name.set("MIT")
                        url.set("https://github.com/ziadfteha/kinetixui/blob/main/LICENSE")
                        distribution.set("repo")
                    }
                }
                developers {
                    developer {
                        id.set("ziadfteha")
                        name.set("Ziad Fteha")
                        url.set("https://github.com/ziadfteha")
                    }
                }
                scm {
                    url.set("https://github.com/ziadfteha/kinetixui")
                    connection.set("scm:git:https://github.com/ziadfteha/kinetixui.git")
                    developerConnection.set("scm:git:ssh://git@github.com/ziadfteha/kinetixui.git")
                }
            }
        }
    }

    repositories {
        // Only registered when Portal credentials are present, so unrelated
        // CI (native-compose.yml) never sees it and can't fail on it.
        if (centralUsername.isPresent && centralPassword.isPresent) {
            maven {
                name = "centralPortal"
                url = uri(
                    "https://ossrh-staging-api.central.sonatype.com/service/local/staging/deploy/maven2/",
                )
                credentials {
                    username = centralUsername.get()
                    password = centralPassword.get()
                }
            }
        }
    }
}

signing {
    // Unsigned is fine for publishToMavenLocal; Central requires signatures,
    // so the key is only present in the publish-compose.yml real-upload job.
    if (signingKey.isPresent) {
        useInMemoryPgpKeys(signingKey.get(), signingKeyPassword.getOrElse(""))
        sign(publishing.publications)
    }
}
