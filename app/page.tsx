"use client";
import { useRef } from "react";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Card,
  CardBody,
  CardHeader
} from "@heroui/card";
import {
  ScrollShadow
} from "@heroui/scroll-shadow";
import {
  Chip
} from "@heroui/chip";
import {
  Avatar
} from "@heroui/avatar";
import {
  Button
} from "@heroui/button";
import {
  Spinner
} from "@heroui/spinner";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure
} from "@heroui/modal";
import {
  Tooltip
} from "@heroui/tooltip";
import {
  Badge
} from "@heroui/badge";
import {
  Progress
} from "@heroui/progress";
// Icons
import {
  SunIcon,
  MoonIcon,
  WifiIcon,
  ExclamationTriangleIcon,
  ServerIcon,
  CpuChipIcon,
  CommandLineIcon,
  SignalIcon,
  ChartBarIcon
} from "@heroicons/react/24/outline";

// 使用 clsx 和 tailwind-merge 实现类名合并功能
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// 定义 cn 工具函数用于合并 Tailwind CSS 类名
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 常量定义
const WS_URL = 'wss://bot.meml.xyz/sign/list';
const RECONNECT_DELAY = 3000;
const HEARTBEAT_INTERVAL = 30000;
const MAX_RECONNECT_ATTEMPTS = 5;

// 接口定义
interface SignData {
  cmd: string;
  version: string;
  path: string;
  uin: string;
}

interface ConnectionStats {
  total: number;
  commands: number;
  versions: number;
  paths: number;
}

// 主题管理 Hook
const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    }
    return 'light';
  });

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  return { theme, toggleTheme };
};

// 统计卡片组件
const StatsCard = ({
  icon: Icon,
  label,
  value,
  color = "primary",
  description
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color?: "primary" | "secondary" | "success" | "warning" | "danger";
  description?: string;
}) => (
  <Card className="bg-gradient-to-br from-white/60 to-white/30 dark:from-gray-800/60 dark:to-gray-800/30 backdrop-blur-xl border-white/20 dark:border-gray-700/30 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl">
    <CardBody className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-3 rounded-2xl",
          color === "primary" && "bg-blue-500/20 text-blue-600 dark:text-blue-400",
          color === "secondary" && "bg-purple-500/20 text-purple-600 dark:text-purple-400",
          color === "success" && "bg-green-500/20 text-green-600 dark:text-green-400",
          color === "warning" && "bg-orange-500/20 text-orange-600 dark:text-orange-400"
        )}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{value}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{label}</p>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{description}</p>
          )}
        </div>
      </div>
    </CardBody>
  </Card>
);

// 连接状态组件
const ConnectionStatus = ({
  isConnected,
  connectionAttempts,
  error
}: {
  isConnected: boolean;
  connectionAttempts: number;
  error: string | null;
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <Tooltip
        content={error ? `错误: ${error}` : isConnected ? "连接正常" : `重连中... (${connectionAttempts}/${MAX_RECONNECT_ATTEMPTS})`}
        color={error ? "danger" : isConnected ? "success" : "warning"}
      >
        <Button
          isIconOnly
          variant="flat"
          size="sm"
          color={error ? "danger" : isConnected ? "success" : "warning"}
          className="min-w-unit-10 h-unit-10"
          onPress={onOpen}
        >
          {error ? (
            <ExclamationTriangleIcon className="w-4 h-4" />
          ) : isConnected ? (
            <WifiIcon className="w-4 h-4" />
          ) : (
            <Spinner size="sm" />
          )}
        </Button>
      </Tooltip>

      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            连接状态详情
          </ModalHeader>
          <ModalBody className="pb-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">连接状态</span>
                <Chip
                  color={error ? "danger" : isConnected ? "success" : "warning"}
                  variant="flat"
                  size="sm"
                >
                  {error ? "连接失败" : isConnected ? "已连接" : "连接中"}
                </Chip>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">服务器地址</span>
                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {WS_URL}
                </code>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">重连次数</span>
                <span className="text-sm">{connectionAttempts}/{MAX_RECONNECT_ATTEMPTS}</span>
              </div>

              {connectionAttempts > 0 && connectionAttempts < MAX_RECONNECT_ATTEMPTS && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">重连进度</span>
                    <span className="text-xs text-gray-500">
                      {Math.round((connectionAttempts / MAX_RECONNECT_ATTEMPTS) * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={(connectionAttempts / MAX_RECONNECT_ATTEMPTS) * 100}
                    color="warning"
                    size="sm"
                    className="w-full"
                  />
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">错误信息</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
                </div>
              )}
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

// 服务项目组件
const ServiceItem = ({
  item,
  index
}: {
  item: SignData;
  index: number;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 50);
    return () => clearTimeout(timer);
  }, [index]);

  const avatarSeed = useMemo(() => `${item.uin}-${item.version}`, [item.uin, item.version]);

  return (
    <div className={cn(
      "transform transition-all duration-500 ease-out",
      isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
    )}>
      <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/30 dark:border-gray-700/30 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group">
        <CardBody className="p-4">
          <div className="flex items-center gap-4">
            <Badge
              content=""
              color="success"
              shape="circle"
              placement="bottom-right"
            >
              <Avatar
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`}
                className="w-12 h-12"
                isBordered
              />
            </Badge>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2 items-center">
                <Chip
                  startContent={<CommandLineIcon className="w-3 h-3" />}
                  color="primary"
                  variant="flat"
                  size="sm"
                  className="text-xs font-semibold"
                >
                  {item.cmd}
                </Chip>

                <Chip
                  startContent={<CpuChipIcon className="w-3 h-3" />}
                  color="secondary"
                  variant="flat"
                  size="sm"
                  className="text-xs font-semibold"
                >
                  {item.version}
                </Chip>

                <Chip
                  startContent={<ServerIcon className="w-3 h-3" />}
                  color="success"
                  variant="flat"
                  size="sm"
                  className="text-xs font-semibold"
                >
                  {item.path}
                </Chip>
              </div>
            </div>

            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Tooltip content="服务详情">
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <ChartBarIcon className="w-4 h-4" />
                </Button>
              </Tooltip>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

// 空状态组件
const EmptyState = ({
  isLoading,
  error,
  signList
}: {
  isLoading: boolean;
  error: string | null;
  signList: SignData[];
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-8 h-8 border-2 border-primary rounded-full animate-spin border-t-transparent" />
        <p className="mt-4 text-lg font-medium text-gray-600 dark:text-gray-400">加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-red-500 mb-4">
          <ExclamationTriangleIcon className="w-12 h-12" />
        </div>
        <p className="text-lg font-medium text-gray-600 dark:text-gray-400">连接失败</p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">{error}</p>
      </div>
    );
  }

  if (!isLoading && signList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-gray-400 mb-4">
          <ServerIcon className="w-12 h-12" />
        </div>
        <p className="text-lg font-medium text-gray-600 dark:text-gray-400">暂无在线服务</p>
      </div>
    );
  }

  return null;
};

// 主组件
export default function QSignDashboard() {
  const { theme, toggleTheme } = useTheme();
  const [signList, setSignList] = useState<SignData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);

  const connectWebSocket = useCallback(() => {
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log("已有 WebSocket 连接，跳过");
      return;
    }
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      console.warn('WebSocket 已存在或正在连接，跳过本次连接');
      return;
    }
    
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    setConnectionAttempts((prev) => prev + 1);

    ws.onopen = () => {
      console.log("WebSocket 已连接");
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
      setIsConnected(true);
      setError(null);
      setIsLoading(false);
      setConnectionAttempts(0);

      ws.send(JSON.stringify({ type: "list" }));

      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "keepalive" }));
        }
      }, HEARTBEAT_INTERVAL);
    };

    ws.onmessage = (event) => {
      try {
        
        const message = JSON.parse(event.data);
        if (message.type === "list" && Array.isArray(message.data)) {
          setSignList(message.data);
        } else if (message.type === "push" && message.data) {
          setSignList((prev) => {
            return [message.data, ...prev];
          });
        }
      } catch (e) {
        console.error("WebSocket 消息解析错误", e);
      }
    };

    ws.onerror = (e) => {
      console.error("WebSocket 错误", e);
      setError("连接错误");
      setIsConnected(false);
      setIsLoading(false);
    };

    ws.onclose = () => {
      console.warn("WebSocket 已关闭");

      setIsConnected(false);

      if (heartbeatRef.current) clearInterval(heartbeatRef.current);

      if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectRef.current = setTimeout(() => {
          connectWebSocket();
        }, RECONNECT_DELAY);
      } else {
        setError("连接失败，已达到最大重试次数");
        setIsLoading(false);
      }
    };
  }, [connectionAttempts]);
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connectWebSocket]);


  // 统计数据
  const stats: ConnectionStats = useMemo(() => {
    const uniqueCommands = new Set(signList.map(item => item.cmd)).size;
    const uniqueVersions = new Set(signList.map(item => item.version)).size;
    const uniquePaths = new Set(signList.map(item => item.path)).size;

    return {
      total: signList.length,
      commands: uniqueCommands,
      versions: uniqueVersions,
      paths: uniquePaths
    };
  }, [signList]);

  return (
    <div className={cn(
      "min-h-screen transition-all duration-500",
      "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50",
      "dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950"
    )}>
      {/* 主题切换按钮 */}
      <div className="fixed top-6 right-6 z-50">
        <Tooltip content={`切换到${theme === 'light' ? '深色' : '浅色'}模式`}>
          <Button
            isIconOnly
            variant="flat"
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-white/30 dark:border-gray-700/30 hover:scale-110 transition-all duration-300 shadow-lg"
            onPress={toggleTheme}
          >
            {theme === 'light' ?
              <MoonIcon className="w-5 h-5" /> :
              <SunIcon className="w-5 h-5" />
            }
          </Button>
        </Tooltip>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 头部区域 */}
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-white/60 to-white/30 dark:from-gray-800/60 dark:to-gray-800/30 backdrop-blur-xl border-white/20 dark:border-gray-700/30 shadow-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                  <Badge
                    content={<SignalIcon className="w-3 h-3" />}
                    color="success"
                    placement="bottom-right"
                  >
                    <Avatar
                      src="https://api.dicebear.com/7.x/bottts/svg?seed=qsign"
                      className="w-16 h-16"
                      isBordered
                    />
                  </Badge>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                      QSign 服务面板
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">实时监控在线服务状态</p>
                  </div>
                </div>
                <ConnectionStatus
                  isConnected={isConnected}
                  connectionAttempts={connectionAttempts}
                  error={error}
                />
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* 统计卡片区域 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatsCard
            icon={ServerIcon}
            label="UIN总数"
            value={stats.commands}
            color="primary"
            description="当前在线的QSign服务数"
          />
          <StatsCard
            icon={CommandLineIcon}
            label="CMD总数"
            value={stats.commands}
            color="secondary"
            description="不同的CMD类型数量"
          />
          <StatsCard
            icon={CpuChipIcon}
            label="版本总数"
            value={stats.versions}
            color="success"
            description="不同的版本数量"
          />
          <StatsCard
            icon={ServerIcon}
            label="路径总数"
            value={stats.paths}
            color="warning"
            description="不同的安装路径数量"
          />
          <StatsCard
            icon={SignalIcon}
            label="记录总数"
            value={stats.total}
            color="danger"
            description="所有的记录总数"
          />
        </div>

        {/* 服务列表区域 */}
        <Card className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-2xl border-white/30 dark:border-gray-700/30 shadow-2xl">
          <CardHeader className="border-b border-white/20 dark:border-gray-700/30">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <ServerIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">在线服务列表</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">实时同步服务状态</p>
                </div>
              </div>
              <Chip
                color={isConnected ? "success" : "warning"}
                variant="flat"
                size="sm"
              >
                {isConnected ? "实时更新" : "连接中"}
              </Chip>
            </div>
          </CardHeader>

          <CardBody className="p-0">
            <ScrollShadow className="h-[calc(80vh-4rem)] p-4 relative">
              <EmptyState isLoading={isLoading} error={error} signList={signList} />
              <div className="grid grid-cols-1 gap-4">
                {signList.map((item, index) => (
                  <ServiceItem key={index} item={item} index={index} />
                ))}
              </div>
            </ScrollShadow>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}