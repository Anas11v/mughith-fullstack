import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '../lib/api';
import { setAvailability, updateProfile } from '../lib/users';
import { useStore } from '../store/useStore';
import { useI18n } from '../lib/i18n';
import { Avatar, Badge, Button, Card, Input } from '../components/common/primitives';
import { IconCheck, IconShield, IconUser } from '../components/common/Icons';

export default function VolunteerProfile() {
  const { t, isAr } = useI18n();
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [certification, setCertification] = useState(user?.certification ?? '');
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  if (!user) return null;

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateProfile({
        name: name.trim() || undefined,
        phone: phone.trim() || null,
        certification: certification.trim() || null,
      });
      setUser(updated);
      toast.success(isAr ? 'تم الحفظ' : 'Saved');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onToggle = async () => {
    setToggling(true);
    try {
      const updated = await setAvailability(!user.isAvailable);
      setUser(updated);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setToggling(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card style={{ textAlign: 'center', padding: '24px 18px' }}>
        <Avatar name={user.name} size={72} />
        <div style={{ fontSize: 19, fontWeight: 700, marginTop: 10 }}>{user.name}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          {user.certification ?? t('certified')} · {user.email}
        </div>
        {user.isVerified && (
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
            <Badge tone="accent">
              <IconShield size={11} /> {t('verified')}
            </Badge>
          </div>
        )}
      </Card>

      <Card>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: 4,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{t('toggle_availability')}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              {isAr ? 'استقبال التنبيهات الفورية' : 'Receive live alerts'}
            </div>
          </div>
          <button
            type="button"
            onClick={onToggle}
            disabled={toggling}
            style={{
              width: 46,
              height: 28,
              borderRadius: 14,
              border: 'none',
              padding: 2,
              background: user.isAvailable ? 'var(--accent)' : 'var(--border-strong)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: user.isAvailable ? 'flex-end' : 'flex-start',
              transition: 'background 150ms ease',
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            />
          </button>
        </label>
      </Card>

      <Card>
        <form onSubmit={onSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label={t('register_name')} icon={<IconUser size={15} />} value={name} onChange={(e) => setName(e.target.value)} />
          <Input label={t('register_phone')} value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input
            label={isAr ? 'الشهادة' : 'Certification'}
            icon={<IconShield size={15} />}
            value={certification}
            onChange={(e) => setCertification(e.target.value)}
            placeholder="BLS, ACLS, PHTLS"
          />
          <Button type="submit" loading={saving} icon={<IconCheck size={15} />}>
            {isAr ? 'حفظ' : 'Save changes'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
