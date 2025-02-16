import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ClockIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';

export default function AddMenu({ isOpen, setIsOpen }) {
  const router = useRouter();

  const menuItems = [
    {
      name: '勤務時間の報告',
      href: '/clockbook',
      icon: ClockIcon,
      description: '勤務時間を入力します',
      bgColor: 'bg-blue-100',
      activeColor: 'active:bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      name: '行動予定の登録',
      href: '/schedule',
      icon: CalendarIcon,
      description: '予定を登録します',
      bgColor: 'bg-green-100',
      activeColor: 'active:bg-green-50',
      iconColor: 'text-green-600'
    }
  ];

  const handleClick = (href) => {
    setIsOpen(false);
    router.push(href);
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={setIsOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500/30 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-full"
              enterTo="opacity-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-full"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-t-2xl bg-white px-4 pb-6 pt-5 text-left transition-all w-full shadow-xl">
                {/* グレーのバー */}
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
                  <div className="h-1 w-12 bg-gray-300 rounded-full"></div>
                </div>

                <div className="mt-4">
                  <Dialog.Title as="h3" className="text-lg font-bold text-gray-900 mb-6 text-center">
                    追加メニュー
                  </Dialog.Title>
                  <div className="space-y-3">
                    {menuItems.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => handleClick(item.href)}
                        className="w-full group active:transform active:scale-98 transition-all duration-150"
                      >
                        <div className={`flex items-center space-x-4 p-4 rounded-xl 
                          border-2 border-transparent
                          transition-all duration-200 
                          hover:border-gray-100 hover:bg-gray-50 
                          active:border-gray-200 ${item.activeColor}
                          shadow-sm hover:shadow-md active:shadow-sm`}
                        >
                          <div className={`${item.bgColor} p-3 rounded-lg 
                            transition-all duration-200 
                            group-hover:scale-110 
                            group-active:scale-95`}
                          >
                            <item.icon className={`h-6 w-6 ${item.iconColor}`} />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-base font-semibold text-gray-900 mb-1">
                              {item.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {item.description}
                            </p>
                          </div>
                          {/* タップ可能を示す矢印アイコン */}
                          <div className="text-gray-400 group-hover:translate-x-1 transition-transform duration-200">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 閉じるボタン */}
                <div className="mt-6">
                  <button
                    type="button"
                    className="w-full px-4 py-3.5 text-sm font-medium text-gray-700 
                      bg-gray-50 hover:bg-gray-100 active:bg-gray-200 
                      rounded-xl transition-colors
                      border-2 border-gray-100 active:border-gray-200
                      active:transform active:scale-98"
                    onClick={() => setIsOpen(false)}
                  >
                    キャンセル
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 