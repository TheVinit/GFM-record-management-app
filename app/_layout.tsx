import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
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
      .then(() => { if (__DEV__) console.log('✅ SQLite ready'); })
      .catch(err => console.error('DB init error', err))
  }, [])

  // ------------------------
  // 2️⃣ Auth boot (once)
  // ------------------------
  useEffect(() => {
    let mounted = true

    const boot = async () => {
      try {
        if (__DEV__) console.log('🚀 [Root] Bootstrapping app...');

        // 1. Ensure SQLite is ready FIRST
        try {
          await initDB();
        } catch (dbErr) {
          if (__DEV__) console.warn('⚠️ [Root] SQLite Init failed, cloud-only mode:', dbErr);
        }

        const session = await getSession()

        if (session) {
          if (__DEV__) console.log('✅ Restored session:', session.role)

          const first = segments[0]
          const isAuth = !first

          if (isAuth) {
            const dest =
              session.role === 'admin'
                ? '/admin/dashboard'
                : session.role === 'teacher'
                  ? '/teacher/dashboard'
                  : session.role === 'attendance_taker'
                    ? '/attendance-taker/dashboard'
                    : '/student/dashboard'

            if (mounted) setIsReady(true)
            setTimeout(() => { router.replace(dest as any) }, 0)
            return;
          }

          // Validate JWT with Supabase (background refresh)
          const { data } = await supabase.auth.getSession()
          if (!data.session) {
            if (__DEV__) console.warn('⚠️ Supabase session expired — clearing cache')
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
          const session = await getSession();
          if (!session) {
            await clearSQLite()
            await clearSession()
            router.replace('/')
          }
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
