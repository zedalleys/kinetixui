plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("maven-publish")
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
    publishing {
        singleVariant("release") {
            withSourcesJar()
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

// Publishing scaffold — deliberately not wired to a remote repository.
// `./gradlew publishToMavenLocal` works with zero setup (writes to ~/.m2);
// real distribution (Maven Central / GitHub Packages) needs your own signing
// key / repository credentials, which don't belong in this repo. Add a
// `repositories { maven { url = ...; credentials { ... } } }` block here
// when you're ready to publish for real.
publishing {
    publications {
        register<MavenPublication>("release") {
            groupId = "com.kinetixui"
            artifactId = "ui-compose"
            version = "0.1.0"
            afterEvaluate {
                from(components["release"])
            }
        }
    }
}
