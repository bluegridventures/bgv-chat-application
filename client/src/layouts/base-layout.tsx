import { Outlet } from "react-router-dom";

const BaseLayout = () => {
  return (
    <div className="flex flex-col w-full min-h-svh">
      <div className="w-full flex-1 flex items-center justify-center px-3 sm:px-4">
        <div className="w-full mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default BaseLayout;
