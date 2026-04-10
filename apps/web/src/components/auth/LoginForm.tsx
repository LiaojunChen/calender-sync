'use client';

import React, { useState, useCallback } from 'react';
import { signIn, signUp } from '@project-calendar/shared';
import { getSupabaseClient } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';
import styles from './LoginForm.module.css';

export default function LoginForm() {
  const { dispatch } = useAppContext();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const client = getSupabaseClient();

  const handleDemoMode = useCallback(() => {
    dispatch({
      type: 'SET_AUTHENTICATED',
      isAuthenticated: true,
      userId: 'demo-user',
    });
    dispatch({ type: 'SET_LOADING', isLoading: false });
    // Use the same IDs as DEMO_CALENDARS so demo events (which use these IDs) are visible
    dispatch({
      type: 'SET_CALENDARS',
      calendars: [
        {
          id: 'cal-personal',
          user_id: 'demo-user',
          name: '个人',
          color: '#039be5',
          is_visible: true,
          is_default: true,
          sort_order: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'cal-work',
          user_id: 'demo-user',
          name: '工作',
          color: '#7986cb',
          is_visible: true,
          is_default: false,
          sort_order: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'cal-study',
          user_id: 'demo-user',
          name: '学习',
          color: '#33b679',
          is_visible: true,
          is_default: false,
          sort_order: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    });
  }, [dispatch]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!email.trim() || !password.trim()) {
        setError('请填写邮箱和密码');
        return;
      }

      if (!client) {
        // No Supabase configured — fall through to demo mode
        handleDemoMode();
        return;
      }

      setLoading(true);

      try {
        const result = isSignUp
          ? await signUp(client, email, password, displayName || undefined)
          : await signIn(client, email, password);

        if (result.error) {
          setError(result.error.message);
        } else if (result.user) {
          dispatch({
            type: 'SET_AUTHENTICATED',
            isAuthenticated: true,
            userId: result.user.id,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '操作失败');
      } finally {
        setLoading(false);
      }
    },
    [client, email, password, displayName, isSignUp, dispatch, handleDemoMode]
  );

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoText}>
            <span className={styles.logoAccent}>Project</span> Calendar
          </span>
        </div>
        <p className={styles.subtitle}>
          {isSignUp ? '创建账户' : '登录您的账户'}
        </p>

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className={styles.formGroup}>
              <label className={styles.label}>显示名称</label>
              <input
                className={styles.input}
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="可选"
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label}>邮箱</label>
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>密码</label>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>

          <button className={styles.submitButton} type="submit" disabled={loading}>
            {loading ? '处理中...' : isSignUp ? '注册' : '登录'}
          </button>
        </form>

        {error && <p className={styles.error}>{error}</p>}

        <p className={styles.switchMode}>
          {isSignUp ? '已有账户？' : '没有账户？'}
          <span className={styles.switchLink} onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? '登录' : '注册'}
          </span>
        </p>

        {/* Demo mode button */}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            onClick={handleDemoMode}
            style={{
              padding: '8px 24px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              cursor: 'pointer',
              background: 'none',
            }}
          >
            演示模式（无需登录）
          </button>
        </div>
      </div>
    </div>
  );
}
