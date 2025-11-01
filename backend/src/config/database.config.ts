// Database connection is now handled by Supabase
// This function is kept for compatibility but does nothing
const connectDatabase = async () => {
  try {
    console.log("Database connection: Using Supabase (no connection needed)");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

export default connectDatabase;
