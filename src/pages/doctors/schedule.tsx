import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Card,
  Typography,
  Spin,
  message,
  Alert,
  Space,
  Button,
  Avatar,
  Tag,
  Breadcrumb,
} from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { supabaseClient } from '../../utility';
import { ScheduleWidget } from '../../components/schedule';

const { Title, Text } = Typography;

interface TimeBlock {
  id: string;
  start: string;
  end: string;
}

interface DaySchedule {
  enabled: boolean;
  timeBlocks: TimeBlock[];
  earlyRegistrationWindow: number;
}

interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface Exception {
  id: string;
  type: 'unavailable' | 'special_hours';
  startDate: string;
  endDate: string;
  reason: string;
  showReasonToPatients: boolean;
  timeBlocks: TimeBlock[];
}

interface Doctor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  specialization: string;
  profile_photo_url?: string;
}

const defaultSchedule: WeeklySchedule = {
  monday: { enabled: false, timeBlocks: [], earlyRegistrationWindow: 0 },
  tuesday: { enabled: false, timeBlocks: [], earlyRegistrationWindow: 0 },
  wednesday: { enabled: false, timeBlocks: [], earlyRegistrationWindow: 0 },
  thursday: { enabled: false, timeBlocks: [], earlyRegistrationWindow: 0 },
  friday: { enabled: false, timeBlocks: [], earlyRegistrationWindow: 0 },
  saturday: { enabled: false, timeBlocks: [], earlyRegistrationWindow: 0 },
  sunday: { enabled: false, timeBlocks: [], earlyRegistrationWindow: 0 },
};

export const DoctorSchedule: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [scheduleData, setScheduleData] = useState<{
    weeklySchedule: WeeklySchedule;
    exceptions: Exception[];
  }>({
    weeklySchedule: defaultSchedule,
    exceptions: [],
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;

      try {
        // Fetch doctor info
        const { data: doctorData, error: doctorError } = await supabaseClient
          .from('doctors')
          .select('id, first_name, last_name, email, specialization, profile_photo_url')
          .eq('id', id)
          .single();

        if (doctorError) throw doctorError;
        setDoctor(doctorData);

        const dayNames = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ];

        // Fetch weekly recurring schedule from doctor_schedules
        const { data: weeklyScheduleRows, error: scheduleError } =
          await supabaseClient
            .from('doctor_schedules')
            .select('*')
            .eq('doctor_id', id)
            .eq('is_active', true)
            .order('day_of_week');

        if (scheduleError) {
          console.error('Error fetching weekly schedule:', scheduleError);
        }

        // Convert to ScheduleWidget format
        const weeklySchedule: WeeklySchedule = { ...defaultSchedule };

        if (weeklyScheduleRows && weeklyScheduleRows.length > 0) {
          weeklyScheduleRows.forEach((row: any) => {
            const dayName = dayNames[row.day_of_week] as keyof WeeklySchedule;
            const startTime = row.start_time.substring(0, 5);
            const endTime = row.end_time.substring(0, 5);

            if (!weeklySchedule[dayName].enabled) {
              weeklySchedule[dayName] = {
                enabled: true,
                timeBlocks: [],
                earlyRegistrationWindow: row.early_registration_window || 0,
              };
            }

            weeklySchedule[dayName].timeBlocks.push({
              id: row.id,
              start: startTime,
              end: endTime,
            });
          });
        }

        // Fetch schedule exceptions
        const { data: exceptionRows, error: exceptionsError } =
          await supabaseClient
            .from('doctor_schedule_exceptions')
            .select('*')
            .eq('doctor_id', id)
            .order('exception_date');

        if (exceptionsError) {
          console.error('Error fetching schedule exceptions:', exceptionsError);
        }

        // Convert to ScheduleWidget exceptions format
        const exceptions: Exception[] = [];

        if (exceptionRows && exceptionRows.length > 0) {
          // Group rows by reason, type, and visibility flag to reconstruct date ranges
          const groupedByReasonAndType = new Map<string, any[]>();

          exceptionRows.forEach((row: any) => {
            const type = row.is_available ? 'special_hours' : 'unavailable';
            const showReason = row.show_reason_to_patients || false;
            const key = `${type}_${row.reason || ''}_${showReason}`;

            if (!groupedByReasonAndType.has(key)) {
              groupedByReasonAndType.set(key, []);
            }
            groupedByReasonAndType.get(key)!.push(row);
          });

          // For each group, find consecutive date ranges
          groupedByReasonAndType.forEach((rows, key) => {
            const parts = key.split('_');
            const type = parts[0] === 'special' ? 'special_hours' : parts[0];
            const showReasonFlag = parts[parts.length - 1] === 'true';
            const reason = parts.slice(type === 'special_hours' ? 2 : 1, -1).join('_');

            rows.sort((a: any, b: any) =>
              a.exception_date.localeCompare(b.exception_date)
            );

            let currentRange: Exception | null = null;

            rows.forEach((row: any, index: number) => {
              const currentDate = row.exception_date;

              if (!currentRange) {
                currentRange = {
                  id: crypto.randomUUID(),
                  type: type as 'unavailable' | 'special_hours',
                  startDate: currentDate,
                  endDate: currentDate,
                  reason: reason,
                  showReasonToPatients: showReasonFlag,
                  timeBlocks: [],
                };

                if (row.is_available && row.start_time && row.end_time) {
                  currentRange.timeBlocks.push({
                    id: crypto.randomUUID(),
                    start: row.start_time.substring(0, 5),
                    end: row.end_time.substring(0, 5),
                  });
                }
              } else {
                const prevDate = new Date(currentRange.endDate);
                const nextDate = new Date(prevDate);
                nextDate.setDate(nextDate.getDate() + 1);
                const expectedDate = nextDate.toISOString().split('T')[0];

                if (currentDate === expectedDate) {
                  currentRange.endDate = currentDate;

                  if (row.is_available && row.start_time && row.end_time) {
                    currentRange.timeBlocks.push({
                      id: crypto.randomUUID(),
                      start: row.start_time.substring(0, 5),
                      end: row.end_time.substring(0, 5),
                    });
                  }
                } else {
                  exceptions.push(currentRange);

                  currentRange = {
                    id: crypto.randomUUID(),
                    type: type as 'unavailable' | 'special_hours',
                    startDate: currentDate,
                    endDate: currentDate,
                    reason: reason,
                    showReasonToPatients: showReasonFlag,
                    timeBlocks: [],
                  };

                  if (row.is_available && row.start_time && row.end_time) {
                    currentRange.timeBlocks.push({
                      id: crypto.randomUUID(),
                      start: row.start_time.substring(0, 5),
                      end: row.end_time.substring(0, 5),
                    });
                  }
                }
              }

              if (index === rows.length - 1 && currentRange) {
                exceptions.push(currentRange);
              }
            });
          });
        }

        setScheduleData({
          weeklySchedule,
          exceptions,
        });
      } catch (err: any) {
        console.error('Error loading schedule:', err);
        setError('Failed to load schedule data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleSave = async (data: {
    weeklySchedule: WeeklySchedule;
    exceptions: Exception[];
  }) => {
    if (!id) return;

    setSaving(true);
    setError(null);

    try {
      const dayMapping: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };

      // Delete existing weekly schedules
      const { error: deleteScheduleError } = await supabaseClient
        .from('doctor_schedules')
        .delete()
        .eq('doctor_id', id);

      if (deleteScheduleError) throw deleteScheduleError;

      // Delete existing exceptions
      const { error: deleteExceptionsError } = await supabaseClient
        .from('doctor_schedule_exceptions')
        .delete()
        .eq('doctor_id', id);

      if (deleteExceptionsError) throw deleteExceptionsError;

      // Insert new weekly recurring schedule
      const weeklyScheduleRows: any[] = [];
      for (const [dayName, dayConfig] of Object.entries(data.weeklySchedule)) {
        if (dayConfig.enabled && dayConfig.timeBlocks.length > 0) {
          const earlyWindow = dayConfig.earlyRegistrationWindow || 0;

          for (const block of dayConfig.timeBlocks) {
            if (block.start && block.end) {
              weeklyScheduleRows.push({
                doctor_id: id,
                day_of_week: dayMapping[dayName],
                start_time: block.start + ':00',
                end_time: block.end + ':00',
                early_registration_window: earlyWindow,
                is_active: true,
              });
            }
          }
        }
      }

      if (weeklyScheduleRows.length > 0) {
        const { error: scheduleError } = await supabaseClient
          .from('doctor_schedules')
          .insert(weeklyScheduleRows);

        if (scheduleError) throw scheduleError;
      }

      // Insert schedule exceptions
      if (data.exceptions && data.exceptions.length > 0) {
        const exceptionRows: any[] = [];

        for (const exception of data.exceptions) {
          const startDate = new Date(exception.startDate);
          const endDate = new Date(exception.endDate);

          for (
            let d = new Date(startDate);
            d <= endDate;
            d.setDate(d.getDate() + 1)
          ) {
            const dateISO = d.toISOString().split('T')[0];

            if (exception.type === 'unavailable') {
              exceptionRows.push({
                doctor_id: id,
                exception_date: dateISO,
                start_time: null,
                end_time: null,
                is_available: false,
                reason: exception.reason || 'Time off',
                show_reason_to_patients: exception.showReasonToPatients || false,
              });
            } else if (exception.type === 'special_hours') {
              for (const block of exception.timeBlocks) {
                if (block.start && block.end) {
                  exceptionRows.push({
                    doctor_id: id,
                    exception_date: dateISO,
                    start_time: block.start + ':00',
                    end_time: block.end + ':00',
                    is_available: true,
                    reason: exception.reason || 'Special hours',
                  });
                }
              }
            }
          }
        }

        if (exceptionRows.length > 0) {
          const { error: exceptionsError } = await supabaseClient
            .from('doctor_schedule_exceptions')
            .insert(exceptionRows);

          if (exceptionsError) throw exceptionsError;
        }
      }

      message.success('Schedule saved successfully!');
    } catch (err: any) {
      console.error('Error saving schedule:', err);
      setError(err.message || 'Failed to save schedule');
      message.error('Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading schedule...</div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <Alert
        type="error"
        message="Doctor not found"
        description="The doctor you are looking for does not exist."
        showIcon
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Breadcrumb
          items={[
            { title: <a onClick={() => navigate('/doctors')}>Doctors</a> },
            { title: <a onClick={() => navigate(`/doctors/show/${id}`)}>Dr. {doctor.first_name} {doctor.last_name}</a> },
            { title: 'Schedule' },
          ]}
          style={{ marginBottom: 16 }}
        />

        <Space style={{ marginBottom: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/doctors/show/${id}`)}
          >
            Back to Doctor
          </Button>
        </Space>

        <Card>
          <Space>
            <Avatar
              size={64}
              src={doctor.profile_photo_url}
              icon={!doctor.profile_photo_url ? <UserOutlined /> : undefined}
              style={{ backgroundColor: '#004777' }}
            >
              {!doctor.profile_photo_url &&
                `${doctor.first_name?.charAt(0)}${doctor.last_name?.charAt(0)}`}
            </Avatar>
            <div>
              <Title level={4} style={{ margin: 0 }}>
                Dr. {doctor.first_name} {doctor.last_name}
              </Title>
              <Space>
                <Text type="secondary">{doctor.email}</Text>
                <Tag color="blue">{doctor.specialization}</Tag>
              </Space>
            </div>
          </Space>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Alert
          type="error"
          message="Error"
          description={error}
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Schedule Widget */}
      <Card>
        <ScheduleWidget
          initialSchedule={scheduleData.weeklySchedule}
          initialExceptions={scheduleData.exceptions}
          onChange={(data) => setScheduleData(data)}
          onSave={handleSave}
          saveButtonText={saving ? 'Saving...' : 'Save Schedule'}
        />
      </Card>
    </div>
  );
};
