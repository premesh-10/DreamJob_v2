import Sidebar from './Sidebar';

function Layout({ children }) {
    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-y-auto">
                <div className="flex-1 p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}

export default Layout;
