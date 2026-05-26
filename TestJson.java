import com.fasterxml.jackson.databind.ObjectMapper;
public class TestJson {
    public static class Event {
        public String driverId;
        public double averageRating;
    }
    public static void main(String[] args) throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        
        // Scenario 1: standard json string
        String validJson = "{\"driverId\":\"123\",\"averageRating\":5.0}";
        try {
            mapper.readValue(validJson, Event.class);
            System.out.println("Scenario 1: Success");
        } catch(Exception e) {
            System.out.println("Scenario 1: " + e.getMessage());
        }

        // Scenario 2: double encoded string
        String doubleEncoded = "\"{\\\"driverId\\\":\\\"123\\\",\\\"averageRating\\\":5.0}\"";
        try {
            mapper.readValue(doubleEncoded, Event.class);
            System.out.println("Scenario 2: Success");
        } catch(Exception e) {
            System.out.println("Scenario 2: " + e.getMessage());
        }
    }
}
