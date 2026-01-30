import { Slot, useRouter, useSegments } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { clearSession, getSession } from '../services/session.service'
import { supabase } from '../services/supabase'
import { clearSQLite, initDB } from '../storage/sqlite'

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false)
  const router = useRouter()
  const segments = useSegments()

  // 🔒 Hard boot locks
  const dbBooted = useRef(false)
  const authBooted = useRef(false)

  // ------------------------
  // 1️⃣ SQLite boot (once)
  // ------------------------
  useEffect(() => {
    if (dbBooted.current) return
    dbBooted.current = true

    initDB()
      .then(() => console.log('✅ SQLite ready'))
      .catch(err => console.error('DB init error', err))
  }, [])

  // ------------------------
  // 2️⃣ Auth boot (once)
  // ------------------------
  useEffect(() => {
    let mounted = true

    const boot = async () => {
      try {
        console.log('🚀 [Root] Bootstrapping app...');

        // 1. Ensure SQLite is ready FIRST (but don't crash if it fails on web)
        try {
          await initDB();
        } catch (dbErr) {
          console.warn('⚠️ [Root] SQLite Init failed, proceeding with cloud-only mode:', dbErr);
        }

        const session = await getSession()


        if (session) {
          console.log('✅ Restored session:', session.role)

          const first = segments[0]
          const isAuth =
            !first || first === 'login'

          if (isAuth) {
            const dest =
              session.role === 'admin'
                ? '/admin/dashboard'
                : session.role === 'teacher'
                  ? '/teacher/dashboard'
                  : '/student/dashboard'

            // ⚠️ Set ready before navigating
            if (mounted) setIsReady(true)

            // Wait a tick for Slot to mount
            setTimeout(() => {
              router.replace(dest as any)
            }, 0)
            return;
          }

          // Validate with Supabase (background)
          const { data } = await supabase.auth.getSession()
          if (!data.session) {
            console.warn('⚠️ Supabase session invalid — clearing cache')
            await clearSQLite()
            await clearSession()
            router.replace('/')
          }
        }
      } catch (e) {
        console.error('Auth bootstrap failed', e)
      } finally {
        if (mounted) setIsReady(true)
      }
    }

    boot()

    // ------------------------
    // 3️⃣ Realtime auth (ONLY future events)
    // ------------------------
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(async (event) => {
        if (event === 'SIGNED_OUT') {
          await clearSQLite()
          await clearSession()
          router.replace('/')
        }
      })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // ------------------------
  // Loader
  // ------------------------
  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return <Slot />
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
